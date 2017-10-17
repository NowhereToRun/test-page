var ip_address = "sec.uniquemachine.org/uniquemachine/";
//var ip_address = "aws.songli.us:5000";

function populateFontList(fontArr) {
  fonts = [];
  for (var key in fontArr) {
    var fontName = fontArr[key];
    fontName = fontName.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    fonts.push(fontName);
  }

  sender.addFonts(fonts);
}
function getResolution() {
      var zoom_level = detectZoom.device();
      var fixed_width = window.screen.width * zoom_level;
      var fixed_height = window.screen.height * zoom_level;
      var res = Math.round(fixed_width) + '_' + Math.round(fixed_height) + '_' + zoom_level + '_' + window.screen.width+"_"+window.screen.height+"_"+window.screen.colorDepth+"_"+window.screen.availWidth + "_" + window.screen.availHeight + "_" + window.screen.left + '_' + window.screen.top + '_' + window.screen.availLeft + "_" + window.screen.availTop + "_" + window.innerWidth + "_" + window.outerWidth + "_" + detectZoom.zoom();
      return res;
}

var Sender = function() {
  this.finalized = false;
  this.postData = {
    WebGL: false,
    inc: "Undefined",
    gpu: "Undefined",
    hash: "Undefined",
    timezone: "Undefined",
    resolution: "Undefined",
    plugins: "Undefined",
    localstorage: "Undefined",
    manufacturer: "Undefined",
    gpuImgs: {},
    adBlock: "Undefined",
    audio: "Undefined",
    langsDetected: [],
    video: []
  };

  sumRGB = function(img) {
    var sum = 0.0;
    for (var i = 0; i < img.length; i += 4) {
      sum += parseFloat(img[i + 0]);
      sum += parseFloat(img[i + 1]);
      sum += parseFloat(img[i + 2]);
    }
    return sum;
  };

  this.nextID = 0;
  this.getID = function() {
    if (this.finalized) {
      throw "Can no longer generate ID's";
      return -1;
    }
    return this.nextID++;
  };

  function hashRGB(array) {
    var hash = 0, i, chr, len, j;
    if (array.length === 0)
      return hash;
    for (i = 0, len = array.length; i < len; i += 4) {
      for (j = 0; j < 3; ++j) {
        chr = array[i] | 0;
        hash ^= (((hash << 5) - hash) + chr + 0x9e3779b9) | 0;
        hash |= 0; // Convert to 32bit integer
      }
    }
    return hash;
  };

  function sumRGB(array) {
    var sum = 0;
    for (var i = 0; i < array.length; i += 4) {
      sum += array[i + 0];
      sum += array[i + 1];
      sum += array[i + 2];
    }
    return sum;
  }

  this.addFonts = function(fonts) {
    this.postData['fontlist'] = fonts;
  };

  this.nextID = 0;
  this.getID = function() {
    if (this.finalized) {
      throw "Can no longer generate ID's";
      return -1;
    }
    return this.nextID++;
  };

  this.getIDs = function(numIDs) {
    var idList = [];
    for (var i = 0; i < numIDs; i++) {
      idList.push(this.getID());
    }
    return idList;
  };

  this.postLangsDetected = function(data) {
    //this.postData['langsDetected'] = data;
  };

  this.getDataFromCanvas = function(ctx, id) {
    if (!this.finalized) {
      throw "Still generating ID's";
      return -1;
    }
    function hash(array) {
      var hash = 0, i, chr, len;
      if (array.length === 0)
        return hash;
      for (i = 0, len = array.length; i < len; i++) {
        chr = array[i] | 0;
        hash ^= (((hash << 5) - hash) + chr + 0x9e3779b9) | 0;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    }
    var w = 256, h = 256;
    // Send pixels to server
    var pixels = ctx.getImageData(0, 0, w, h).data;
    var hashV = hash(pixels);
    console.log("CTX: " + hashV);

    this.toServer(false, "None", "None", hashV, id, pixels);
    if (sumRGB(pixels) > 1.0) {
      return hashRGB(pixels);
    } else {
      return 0;
    }
  };

  this.getData = function(gl, id) {
    if (!this.finalized) {
      throw "Still generating ID's";
      return -1;
    }
    if(gl == 'error'){
      // 错误处理
      this.toServer('true', 'ven', 'ren', 'hash', id, 'error');
      return 0;
    }
    var WebGL = true;
    var pixels = new Uint8Array(256 * 256 * 4);
    gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    var ven, ren;
    var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      ven = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      ren = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    } else {
      console.log("debugInfo is not accessable");
      ven = 'No debug Info';
      ren = 'No debug Info';
    }
    var hash = pixels.hashCode();
    //console.log("gl: " + hash);

    this.toServer(WebGL, ven, ren, hash, id, pixels);
    if (sumRGB(pixels) > 1.0) {
      return hashRGB(pixels);
    } else {
      return 0;
    }
  };

  this.urls = [];
  this.finished = 0;

  this.toServer = function(
      WebGL, inc, gpu, hash, id,
      dataurl) { // send messages to server and receive messages from server
    
    // 错误处理
    if(dataurl == 'error'){
      this.postData['gpuImgs'][id] = 'error';
    }else{
      this.postData['gpuImgs'][id] = dataurl.hashCode(); 
    }
    // this.postData['gpuImgs'][id] = calcSHA1(dataurl); 
    
    if (WebGL) {
      this.postData['WebGL'] = WebGL;
      this.postData['inc'] = inc;
      this.postData['gpu'] = gpu;
      this.postData['hash'] = hash;
    }
  };

  this.sendData =
    function() {
      $('#status').html("Getting Fonts (This may take a long time)");


      this.postData['timezone'] = new Date().getTimezoneOffset();


      /**
       * this part is used for dected the real resolution
       */
      this.postData['resolution'] = getResolution();


      //console.log(this.postData['adBlock'])

      this.postData['audio'] = audioFingerPrinting();
      this.postData['langsDetected'] = get_writing_scripts();
      console.log(this.postData)
      $('#status').html("Waitting for the server...");
      startSend(this.postData);

      function startSend(postData){
        parent.postMessage(postData,"*");
        // $.ajax({
        //   url : "http://" + ip_address + "/features",
        //   dataType : "json",
        //   contentType: 'application/json',
        //   type : 'POST',
        //   data : JSON.stringify(postData),
        //   success : function(data) {
        //     console.log(data);
        //     //parent.postMessage(data,"http://127.0.0.1:9876");
        //     parent.postMessage(data,"http://uniquemachine.org");
        //   },
        //   error: function (xhr, ajaxOptions, thrownError) {
        //     alert(thrownError);
        //   }
        // });

      }

  }
};

/* Converts the charachters that aren't UrlSafe to ones that are and
   removes the padding so the base64 string can be sent
   */
Base64EncodeUrlSafe = function(str) {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
};

stringify = function(array) {
  var str = "";
  for (var i = 0, len = array.length; i < len; i += 4) {
    str += String.fromCharCode(array[i + 0]);
    str += String.fromCharCode(array[i + 1]);
    str += String.fromCharCode(array[i + 2]);
  }

  // NB: AJAX requires that base64 strings are in their URL safe
  // form and don't have any padding
  var b64 = window.btoa(str);
  return Base64EncodeUrlSafe(b64);
};

Uint8Array.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0)
    return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr = this[i];
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
