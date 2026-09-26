// mock-dom.js - Mock DOM for Node.js
global.window = global.window || {}
global.document = {
  createElement: function() {
    var el = {
      style: {},
      setAttribute: function(){},
      appendChild: function(){},
      querySelector: function(){ return null; },
      children: [],
      getAttribute: function(){ return ''; },
      removeAttribute: function(){},
      cloneNode: function(){ return { style: {}, children: [] }; },
      querySelectorAll: function() { return []; },
      getAttribute: function(){ return ''; },
      setAttribute: function(){},
      appendChild: function(){},
      querySelector: function(){ return null; },
      children: [],
      removeAttribute: function(){},
      outerHTML: '<div></div>'
    }
    return el
  },
  getElementById: function() {
    return {
      style: {},
      textContent: '',
      children: [],
      getAttribute: function(){ return ''; },
      setAttribute: function(){},
      appendChild: function(){},
      querySelector: function(){ return null; },
      children: [],
      cloneNode: function(){ return { style: {}, children: [] }; },
      outerHTML: '<div></div>',
      querySelectorAll: function() { return []; },
      querySelector: function(){ return null; },
      removeAttribute: function(){},
      removeChild: function(){}
    }
  },
  querySelectorAll: function() { return [] },
  querySelector: function() { return null },
  createElementNS: function() { return { style: {}, children: [] } },
  fonts: { ready: Promise.resolve() }
}

global.navigator = { userAgent: 'node' }
global.HTMLCanvasElement = function() { return { width: 0, height: 0, getContext: function() { return { drawImage: function(){} } } } }
global.Image = function() { return { onload: null, onerror: null, src: '' } }

// URL constructor
global.URL = function(url) {
  this.href = url
  var a = document.createElement('a')
  a.href = url
  this.protocol = a.protocol
  this.host = a.host
  this.hostname = a.hostname
  this.port = a.port
  this.pathname = a.pathname
  this.search = a.search
  this.hash = a.hash
  this.origin = a.origin
  this.toString = function() { return this.href }
  this.toJSON = function() { return this.href }
}
global.URL.createObjectURL = function() { return '' }
global.URL.revokeObjectURL = function() {}

global.Image = function() { return { onload: null, onerror: null, src: '' } }

// Override global fetch to use mocked URL
global.fetch = function(url, options) {
  return new Promise(function(resolve, reject) {
    var isHttps = url.indexOf('https://') === 0
    var client = url.indexOf('https://') === 0 ? require('https') : require('http')
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function(res) {
      var data = ''
      res.on('data', function(c) { data += c })
      res.on('end', function() {
        resolve({
          ok: true,
          json: function() { return Promise.resolve(JSON.parse(data)) },
          text: function() { return Promise.resolve(data) }
        })
      })
    }).on('error', function(e) { reject(e) })
  })
}

global.Image = function() { return { onload: null, onerror: null, src: '' } }
global.URL.createObjectURL = function() { return '' }
global.URL.revokeObjectURL = function() {}
global.Blob = function() { return {} }
global.FileReader = function() { return { readAsDataURL: function(){}, onload: null, onerror: null } }
global.HTMLCanvasElement = function() { return { width: 0, height: 0, getContext: function() { return { drawImage: function(){} } } } }
global.Image = function() { return { onload: null, onerror: null, src: '' } }
global.URL = { createObjectURL: function() { return '' }, revokeObjectURL: function(){} }
global.Blob = function() { return {} }
global.FileReader = function() { return { readAsDataURL: function(){}, onload: null, onerror: null } }