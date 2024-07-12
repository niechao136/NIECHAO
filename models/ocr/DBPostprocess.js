
let _boundaryCheckingState = false;

const CV = require('../../opencv/opencv')
const clipper = require('js-clipper')

const Polygon = require('d3-polygon');

/**
 * 把错误的数据转正
 * strip(0.09999999999999998)=0.1
 */
function strip(num, precision = 15) {
  return +parseFloat(Number(num).toPrecision(precision));
}

/**
 * Return digits length of a number
 * @param {*number} num Input number
 */
function digitLength(num) {
  // Get digit length of e
  const eSplit = num.toString().split(/[eE]/);
  const len = (eSplit[0].split('.')[1] || '').length - +(eSplit[1] || 0);
  return len > 0 ? len : 0;
}

/**
 * 把小数转成整数，支持科学计数法。如果是小数则放大成整数
 * @param {*number} num 输入数
 */
function float2Fixed(num) {
  if (num.toString().indexOf('e') === -1) {
    return Number(num.toString().replace('.', ''));
  }
  const dLen = digitLength(num);
  return dLen > 0 ? strip(Number(num) * Math.pow(10, dLen)) : Number(num);
}

/**
 * 检测数字是否越界，如果越界给出提示
 * @param {*number} num 输入数
 */
function checkBoundary(num) {
  if (_boundaryCheckingState) {
    if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
      console.warn(`${num} is beyond boundary when transfer to integer, the results may not be accurate`);
    }
  }
}

/**
 * 迭代操作
 */
function iteratorOperation(arr, operation) {
  const [num1, num2, ...others] = arr;
  let res = operation(num1, num2);

  others.forEach((num) => {
    res = operation(res, num);
  });

  return res;
}

/**
 * 精确乘法
 */
function times(...nums) {
  if (nums.length > 2) {
    return iteratorOperation(nums, times);
  }

  const [num1, num2] = nums;
  const num1Changed = float2Fixed(num1);
  const num2Changed = float2Fixed(num2);
  const baseNum = digitLength(num1) + digitLength(num2);
  const leftValue = num1Changed * num2Changed;

  checkBoundary(leftValue);

  return leftValue / Math.pow(10, baseNum);
}


/**
 * 精确加法
 */
function plus(...nums) {
  if (nums.length > 2) {
    return iteratorOperation(nums, plus);
  }

  const [num1, num2] = nums;
  // 取最大的小数位
  const baseNum = Math.pow(10, Math.max(digitLength(num1), digitLength(num2)));
  // 把小数都转为整数然后再计算
  return (times(num1, baseNum) + times(num2, baseNum)) / baseNum;
}


/**
 * 精确除法
 */
function divide(...nums) {
  if (nums.length > 2) {
    return iteratorOperation(nums, divide);
  }

  const [num1, num2] = nums;
  const num1Changed = float2Fixed(num1);
  const num2Changed = float2Fixed(num2);
  checkBoundary(num1Changed);
  checkBoundary(num2Changed);
  // fix: 类似 10 ** -4 为 0.00009999999999999999，strip 修正
  return times(num1Changed / num2Changed, strip(Math.pow(10, digitLength(num2) - digitLength(num1))));
}

function clip(data, min, max) {
  return data < min ? min : data > max ? max : data;
}

function int(num) {
  return num > 0 ? Math.floor(num) : Math.ceil(num);
}

function flatten(arr) {
  return arr.toString().split(',').map(item => +item);
}

class DBPostprocess {
  thresh;
  box_thresh;
  max_candidates;
  unclip_ratio;
  min_size;
  pred;
  segmentation;
  width;
  height;

  constructor(result, shape) {
    this.thresh = 0.3;
    this.box_thresh = 0.5;
    this.max_candidates = 1000;
    this.unclip_ratio = 1.6;
    this.min_size = 3;
    this.width = shape[0];
    this.height = shape[1];
    this.pred = result;
    this.segmentation = [];

    this.pred.forEach((item) => {
      this.segmentation.push(item > this.thresh ? 255 : 0);
    });
  }

  outputBox() {
    const src = new CV.matFromArray(this.width, this.height, CV.CV_8UC1, this.segmentation);
    const contours = new CV.MatVector();
    const hierarchy = new CV.Mat();

    CV.findContours(src, contours, hierarchy, CV.RETR_LIST, CV.CHAIN_APPROX_SIMPLE);
    const num_contours = Math.min(contours.size(), this.max_candidates);
    const boxes = [];
    const scores = [];
    const arr = [];

    for (let i = 0; i < num_contours; i++) {
      const contour = contours.get(i);
      let { points, side } = this.get_mini_boxes(contour);
      if (side < this.min_size) {
        continue;
      }
      const score = this.box_score_fast(this.pred, points);
      if (this.box_thresh > score) {
        continue;
      }
      let box = this.unclip(points);
      const boxMap = new CV.matFromArray(box.length / 2, 1, CV.CV_32SC2, box);
      const resultObj = this.get_mini_boxes(boxMap);
      box = resultObj.points;
      side = resultObj.side;
      if (side < this.min_size + 2) {
          continue;
      }

      box.forEach(item => {
        item[0] = clip(Math.round(item[0]), 0, this.width);
        item[1] = clip(Math.round(item[1]), 0, this.height);
      });
      boxes.push(box);
      scores.push(score);
      arr.push(i);
      boxMap.delete();
    }

    src.delete();
    contours.delete();
    hierarchy.delete();
    return { boxes, scores };
  }

  get_mini_boxes(contour) {
    // 生成最小外接矩形
    const bounding_box = CV.minAreaRect(contour);
    const points = [];
    const mat = new CV.Mat();

    // 获取矩形的四个顶点坐标
    CV.boxPoints(bounding_box, mat);
    console.log(bounding_box, mat)

    for (let i = 0; i < mat.data32F.length; i += 2) {
      const arr = [];
      arr[0] = mat.data32F[i];
      arr[1] = mat.data32F[i + 1];
      points.push(arr);
    }

    function sortNumber(a, b) {
      return a[0] - b[0];
    }
    points.sort(sortNumber);

    let index_1 = 0;
    let index_2 = 1;
    let index_3 = 2;
    let index_4 = 3;
    if (points[1][1] > points[0][1]) {
        index_1 = 0;
        index_4 = 1;
    }
    else {
        index_1 = 1;
        index_4 = 0;
    }

    if (points[3][1] > points[2][1]) {
        index_2 = 2;
        index_3 = 3;
    }
    else {
        index_2 = 3;
        index_3 = 2;
    }

    const box = [
      points[index_1],
      points[index_2],
      points[index_3],
      points[index_4]
    ];

    const side = Math.min(bounding_box.size.height, bounding_box.size.width);
    mat.delete();

    return { points: box, side };
  }

  box_score_fast(bitmap, _box) {
    const h = this.height;
    const w = this.width;
    const box = JSON.parse(JSON.stringify(_box));
    const x = [];
    const y = [];

    box.forEach(item => {
      x.push(item[0]);
      y.push(item[1]);
    });

    // clip这个函数将将数组中的元素限制在a_min, a_max之间，大于a_max的就使得它等于 a_max，小于a_min,的就使得它等于a_min。
    const xmin = clip(Math.floor(Math.min(...x)), 0, w - 1);
    const xmax = clip(Math.ceil(Math.max(...x)), 0, w - 1);
    const ymin = clip(Math.floor(Math.min(...y)), 0, h - 1);
    const ymax = clip(Math.ceil(Math.max(...y)), 0, h - 1);

    const mask = new CV.Mat.zeros(ymax - ymin + 1, xmax - xmin + 1, CV.CV_8UC1);
    box.forEach(item => {
        item[0] = Math.max(item[0] - xmin, 0);
        item[1] = Math.max(item[1] - ymin, 0);
    });
    const npts = 4;
    const point_data = new Uint8Array(box.flat());
    const points = CV.matFromArray(npts, 1, CV.CV_32SC2, point_data);
    const pts = new CV.MatVector();
    pts.push_back(points);
    const color = new CV.Scalar(255);

    // 多个多边形填充
    CV.fillPoly(mask, pts, color, 1);
    const sliceArr = [];
    for (let i = ymin; i < ymax + 1; i++) {
        sliceArr.push(...bitmap.slice(this.width * i + xmin, this.height * i + xmax + 1));
    }
    const mean = this.mean(sliceArr, mask.data);
    mask.delete();
    points.delete();
    pts.delete();
    return mean;
  }

  unclip(box) {
    const unclip_ratio = this.unclip_ratio;
    const area = Math.abs(Polygon.polygonArea(box));
    const length = Polygon.polygonLength(box);
    const distance = area * unclip_ratio / length;
    const tmpArr = [];
    box.forEach(item => {
        const obj = {
            X: 0,
            Y: 0
        };
        obj.X = item[0];
        obj.Y = item[1];
        tmpArr.push(obj);
    });
    const offset = new clipper.ClipperOffset();
    offset.AddPath(tmpArr, clipper.JoinType.jtRound, clipper.EndType.etClosedPolygon);
    const expanded = [];
    offset.Execute(expanded, distance);
    let expandedArr = [];
    expanded[0] && expanded[0].forEach(item => {
        expandedArr.push([item.X, item.Y]);
    });
    expandedArr = [].concat(...expandedArr);
    return expandedArr;
  }

  mean(data, mask) {
    let sum = 0;
    let length = 0;
    for (let i = 0; i < data.length; i++) {
        if (mask[i]) {
            sum = plus(sum, data[i]);
            length++;
        }
    }
    const num = divide(sum, length);
    return num;
  }
}

module.exports = {
  clip, int, flatten,
  DBPostprocess,
}

