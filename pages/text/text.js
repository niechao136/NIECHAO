// pages/text.js
import * as paddlejs from '@paddlejs/paddlejs-core'
import '@paddlejs/paddlejs-backend-webgl'

const plugin = requirePlugin("paddlejs-plugin")
plugin.register(paddlejs, wx)
let pdjs

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
        }
      }
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    pdjs = new paddlejs.Runner({
      
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