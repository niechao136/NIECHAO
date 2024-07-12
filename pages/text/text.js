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
            query.select('#image').boundingClientRect().exec(async (_res) => {
              console.log(res, _res)
              const c = wx.createOffscreenCanvas({ type: '2d', width: _res[0].width, height: _res[0].height })
              const context = c.getContext('2d')
              const image = c.createImage()
              await new Promise(resolve => {
                image.onload = resolve
                image.src = res.tempFiles[0].tempFilePath
              })
              context.clearRect(0, 0, _res[0].width, _res[0].height)
              context.drawImage(image, 0, 0, _res[0].width, _res[0].height)
              // console.log(c, image)
              const result = await ocr.recognize(image);
              console.log(result, image)
              if (result.text?.length > 0) {
                this.setData({
                  text: result.text
                })
              }
            })
            // console.log(image, canvas)
            // const res = await ocr.recognize(image, { canvas });
            // console.log(res, image, canvas)
            // if (res.text?.length > 0) {
            //   this.setData({
            //     text: res.text
            //   })
            // }
          }, 5000)
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
      mask: true,
    })

    ocr.init().then(() => {
      wx.hideLoading()
    })
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
