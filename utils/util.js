const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const authorize = scopeName => {
  wx.showLoading({
    title: '加载中',
    mask: true,
  })
  return new Promise((resolve, reject) => {
    const scope = 'scope.' + scopeName
    wx.getSetting({
      success(res) {
        if (res.authSetting[scope]) {
          wx.hideLoading()
          resolve()
          return
        }
        wx.authorize({
          scope,
          success() {
            resolve()
          },
          fail() {
            wx.showModal({
              title: '权限申请',
              content: '该小程序需要使用您以下权限',
              cancelText: '取消',
              cancelColor: '#999',
              confirmText: '前往',
              confirmColor: '#07C160',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting()
                } else if (res.cancel) {
                  authorize(scopeName)
                }
              },
              fail() {
                reject(new Error('获取权限失败'));
              }
            })
          },
          complete() {
            wx.hideLoading()
          }
        })
      },
      fail() {
        reject(new Error('获取权限失败'));
      }
    })
  })
}

module.exports = {
  authorize,
  formatTime
}
