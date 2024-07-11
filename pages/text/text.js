// pages/text.js
const ocr = require('../../models/ocr/index')
const query = wx.createSelectorQuery()
let canvas, image

Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  takePhoto() {

  },

  localPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: 'image',
      sourceType: 'album',
      success: (res) => {
        console.log(res)
        if (res.type === 'image' && res.errMsg === 'chooseMedia:ok') {
          this.setData({
            src: res.tempFiles[0].tempFilePath
          })
          setTimeout(async () => {
            console.log(image, canvas)
            const res = await ocr.recognize(image, { canvas });
            console.log(res, image, canvas)
            if (res.text?.length > 0) {
              this.setData({
                text: res.text
              })
            }
          }, 1000)
        }
      }
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    wx.showLoading({
      title: 'Loading',
    })
    
    // canvas = this.$('#canvas')
    // image = this.$('#image')
    query.select('#canvas').node()
    query.select('#image').node()
    query.select('#canvas').context()
    query.select('#image').context()
    query.select('#canvas').boundingClientRect()
    query.select('#image').boundingClientRect()
    query.exec(res => {
      console.log(query.select('#canvas'), res)
    })

    console.log(this)
    // ocr.init().then(() => {
    //   wx.hideLoading()
    // })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})
