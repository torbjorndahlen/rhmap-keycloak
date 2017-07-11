/**
 * FeedHenry License
 */

//if (typeof window =="undefined"){
//    var window={};
//}
//this is a partial js file which defines the start of appform SDK closure
(function(_scope){
    //start module

var appForm = function(module) {
  module.init = init;

  function init(params, cb) {
    var def = {
      'updateForms': true
    };
    if (typeof cb === 'undefined') {
      cb = params;
    } else {
      for (var key in params) {
        def[key] = params[key];
      }
    }


    //init config module
    var config = def.config || {};
    appForm.config = appForm.models.config;
    appForm.config.init(config, function(err) {
      if (err) {
        $fh.forms.log.e("Form config loading error: ", err);
      }
      appForm.models.log.loadLocal(function(err) {
        if(err){
          console.error("Error loading config from local storage");
        }

        appForm.models.submissions.loadLocal(function(err){
          if(err){
            console.error("Error loading submissions");
          }

          //Loading the current state of the uploadManager for any upload tasks that are still in progress.
          appForm.models.uploadManager.loadLocal(function(err) {
            $fh.forms.log.d("Upload Manager loaded from memory.");
            if (err) {
              $fh.forms.log.e("Error loading upload manager from memory ", err);
            }

            //Starting any uploads that are queued
            appForm.models.uploadManager.start();
            //init forms module
            $fh.forms.log.l("Refreshing Theme.");
            appForm.models.theme.refresh(true, function(err) {
              if (err) {
                $fh.forms.log.e("Error refreshing theme ", err);
              }
              if (def.updateForms === true) {
                $fh.forms.log.l("Refreshing Forms.");
                appForm.models.forms.refresh(true, function(err) {
                  if (err) {
                    $fh.forms.log.e("Error refreshing forms: ", err);
                  }
                  cb();
                });
              } else {
                cb();
              }
            });
          });
        });

      });
    });
  }
  return module;
}(appForm || {});
appForm.utils = function(module) {
  module.extend = extend;
  module.localId = localId;
  module.md5 = md5;
  module.getTime = getTime;
  module.send=send;
  module.isPhoneGap = isPhoneGap;
  module.generateGlobalEventName = function(type, eventName){
    return "" + type + ":" + eventName;
  };

  function isPhoneGap() {
    return (typeof window.Phonegap !== "undefined" || typeof window.cordova !== "undefined");
  }

  function extend(child, parent) {

    if (parent.constructor && parent.constructor === Function) {
      for (var mkey in parent.prototype) {
        child.prototype[mkey] = parent.prototype[mkey];
      }
    } else {
      for (var key in parent) {
        child.prototype[key] = parent[key];
      }
    }
  }

  function getTime(timezoneOffset) {
    var now = new Date();
    if (timezoneOffset) {
      return now.getTimezoneOffset();
    } else {
      return now;
    }
  }

  function localId(model) {
    var props = model.getProps();
    var _id = props._id;
    var _type = props._type;
    var ts = getTime().getTime();
    if (_id && _type) {
      return _id + '_' + _type + '_' + ts;
    } else if (_id) {
      return _id + '_' + ts;
    } else if (_type) {
      return _type + '_' + ts;
    } else {
      return ts;
    }
  }
  /**
   * md5 hash a string
   * @param  {[type]}   str [description]
   * @param  {Function} cb  (err,md5str)
   * @return {[type]}       [description]
   */
  function md5(str, cb) {
    if (typeof $fh !== 'undefined' && $fh.hash) {
      $fh.hash({
        algorithm: 'MD5',
        text: str
      }, function(result) {
        if (result && result.hashvalue) {
          cb(null, result.hashvalue);
        } else {
          cb('Crypto failed.');
        }
      });
    } else {
      cb('Crypto not found');
    }
  }

  function send(params,cb){
    $fh.forms.log.d("Sending mail: ", params);
    $fh.send(params,function(){
      cb(null);
    },function(msg){
      cb(msg);
    });
  }
  return module;
}(appForm.utils || {});

appForm.utils = function(module) {
    module.fileSystem = {
        isFileSystemAvailable: isFileSystemAvailable,
        save: save,
        remove: remove,
        readAsText: readAsText,
        readAsBlob: readAsBlob,
        readAsBase64Encoded: readAsBase64Encoded,
        readAsFile: readAsFile,
        fileToBase64: fileToBase64,
        getBasePath: getBasePath,
        clearFileSystem: clearFileSystem
    };
    var fileSystemAvailable = false;
    var _requestFileSystem = function() {
        console.error("No file system available");
    };
    //placeholder
    var PERSISTENT = 1;
    //placeholder
    function isFileSystemAvailable() {
        _checkEnv();
        return fileSystemAvailable;
    }
    //convert a file object to base64 encoded.
    function fileToBase64(file, cb) {
        if (!file instanceof File) {
            return cb('Only file object can be used for converting');
        }
        var fileReader = new FileReader();
        fileReader.onloadend = function(evt) {
            var text = evt.target.result;
            return cb(null, text);
        };
        fileReader.readAsDataURL(file);
    }

    function _createBlobOrString(contentstr) {
        var retVal;
        if (appForm.utils.isPhoneGap()) { // phonegap filewriter works with strings, later versions also ork with binary arrays, and if passed a blob will just convert to binary array anyway
            retVal = contentstr;
        } else {
            var targetContentType = 'text/plain';
            try {
                retVal = new Blob([contentstr], {
                    type: targetContentType
                }); // Blob doesn't exist on all androids
            } catch (e) {
                // TypeError old chrome and FF
                var blobBuilder = window.BlobBuilder ||
                    window.WebKitBlobBuilder ||
                    window.MozBlobBuilder ||
                    window.MSBlobBuilder;
                if (e.name === 'TypeError' && blobBuilder) {
                    var bb = new blobBuilder();
                    bb.append([contentstr.buffer]);
                    retVal = bb.getBlob(targetContentType);
                } else {
                    // We can't make a Blob, so just return the stringified content
                    retVal = contentstr;
                }
            }
        }
        return retVal;
    }


    function getBasePath(cb) {
        save("dummy.txt", "TestContnet", function(err, fileEntry) {
            if (err) {
                return cb(err);
            }

            _getFileEntry("dummy.txt",0, {}, function(err, fileEntry){
              var sPath = fileEntry.localURL.replace("dummy.txt", "");
              fileEntry.remove();
              return cb(null, sPath);
            });
        });
    }

    function _getSaveObject(content){
      var saveObj = null;
      if (typeof content === 'object' && content !== null) {
        if (content instanceof File || content instanceof Blob) {
          //File object
          saveObj = content;
        } else {
          //JSON object
          var contentstr = JSON.stringify(content);
          saveObj = _createBlobOrString(contentstr);
        }
      } else if (typeof content === 'string') {
        saveObj = _createBlobOrString(content);
      }

      return saveObj;
    }

    /**
     * Save a content to file system into a file
     *
     * In the case where the content is a File and PhoneGap is available, the function will attempt to use the "copyTo" function instead of writing the file.
     * This is because windows phone does not allow writing binary files with PhoneGap.
     * @param  {[type]} fileName file name to be stored.
     * @param  {[type]} content  json object / string /  file object / blob object
     * @param  {[type]} cb  (err, result)
     * @return {[type]}          [description]
     */
    function save(fileName, content, cb) {
      var self = this;
      var saveObj = _getSaveObject(content);
      if(saveObj === null){
        return cb("Invalid content type. Object was null");
      }
      var size = saveObj.size || saveObj.length;

      _getFileEntry(fileName, size, {
          create: true
      }, function(err, fileEntry) {
          if (err) {
              cb(err);
          } else {
            if(appForm.utils.isPhoneGap() && saveObj instanceof File){
              //Writing binary files is not possible in windows phone.
              //So if the thing to save is a file, and it is in phonegap, use the copyTo functions instead.
              fileEntry.getParent(function(parentDir){
                //Get the file entry for the file input
                _resolveFile(saveObj.localURL, function(err, fileToCopy){
                  if(err){
                    return cb(err);
                  }
                  fileName = fileEntry.name;

                  fileEntry.remove(function(){
                    fileToCopy.copyTo(parentDir, fileName, function(copiedFile){
                      return cb(null, copiedFile);
                    }, function(err){
                      return cb(err);
                    });
                  }, function(err){
                    return cb(err);
                  });
                }, function(err){
                  return cb(err);
                });
              }, function(err){
                return cb(err);
              });
            }  else {
              //Otherwise, just write text
              fileEntry.createWriter(function(writer) {
                function _onFinished(evt) {
                  return cb(null, evt);
                }

                function _onTruncated() {
                  writer.onwriteend = _onFinished;
                  writer.write(saveObj); //write method can take a blob or file object according to html5 standard.
                }
                writer.onwriteend = _onTruncated;
                //truncate the file first.
                writer.truncate(0);
              }, function(e) {
                cb('Failed to create file write:' + e);
              });
            }

          }
      });
    }
    /**
     * Remove a file from file system
     * @param  {[type]}   fileName file name of file to be removed
     * @param  {Function} cb
     * @return {[type]}            [description]
     */
    function remove(fileName, cb) {
        _getFileEntry(fileName, 0, {}, function(err, fileEntry) {
            if (err) {
                if (!(err.name === 'NotFoundError' || err.code === 1)) {
                    return cb(err);
                } else {
                    return cb(null, null);
                }
            }
            fileEntry.remove(function() {
                cb(null, null);
            }, function(e) {
                cb('Failed to remove file' + e);
            });
        });
    }


    /**
     * clearFileSystem - Clearing All Of The Files In the file system.
     *
     * @param  {type} cb       description
     * @return {type}          description
     */
    function clearFileSystem(cb){
      function gotFS(fileSystem) {
          var reader = fileSystem.root.createReader();
          reader.readEntries(gotList, cb);
      }

      function gotList(entries) {
          async.forEachSeries(entries, function(entry, cb){
            if(entry.isDirectory){
              entry.removeRecursively(cb, cb);
            } else {
              entry.remove(cb, cb);
            }
          }, cb);
      }

      _requestFileSystem(PERSISTENT, 0, gotFS, cb);
    }

    /**
     * Read a file as text
     * @param  {[type]}   fileName [description]
     * @param  {Function} cb       (err,text)
     * @return {[type]}            [description]
     */
    function readAsText(fileName, cb) {
        _getFile(fileName, function(err, file) {
            if (err) {
                cb(err);
            } else {
                var reader = new FileReader();
                reader.onloadend = function(evt) {
                    var text = evt.target.result;
                    if (typeof text === "object") {
                      text = JSON.stringify(text);
                    }
                    // Check for URLencoded
                    // PG 2.2 bug in readAsText()
                    try {
                        text = decodeURIComponent(text);
                    } catch (e) {

                    }
                    return cb(null, text);
                };
                reader.readAsText(file);
            }
        });
    }
    /**
     * Read a file and return base64 encoded data
     * @param  {[type]}   fileName [description]
     * @param  {Function} cb       (err,base64Encoded)
     * @return {[type]}            [description]
     */
    function readAsBase64Encoded(fileName, cb) {
        _getFile(fileName, function(err, file) {
            if (err) {
                return cb(err);
            }
            var reader = new FileReader();
            reader.onloadend = function(evt) {
                var text = evt.target.result;
                return cb(null, text);
            };
            reader.readAsDataURL(file);
        });
    }
    /**
     * Read a file return blob object (which can be used for XHR uploading binary)
     * @param  {[type]}   fileName [description]
     * @param  {Function} cb       (err, blob)
     * @return {[type]}            [description]
     */
    function readAsBlob(fileName, cb) {
        _getFile(fileName, function(err, file) {
            if (err) {
                return cb(err);
            } else {
                var type = file.type;
                var reader = new FileReader();
                reader.onloadend = function(evt) {
                    var arrayBuffer = evt.target.result;
                    var blob = new Blob([arrayBuffer], {
                        'type': type
                    });
                    cb(null, blob);
                };
                reader.readAsArrayBuffer(file);
            }
        });
    }

    function readAsFile(fileName, cb) {
        _getFile(fileName, cb);
    }
    /**
     * Retrieve a file object
     * @param  {[type]}   fileName [description]
     * @param  {Function} cb     (err,file)
     * @return {[type]}            [description]
     */
    function _getFile(fileName, cb) {
        _getFileEntry(fileName, 0, {}, function(err, fe) {
            if (err) {
                return cb(err);
            }
            fe.file(function(file) {
                cb(null, file);
            }, function(e) {
                cb(e);
            });
        });
    }

    function _resolveFile(fileName, cb){
      //This is necessary to get the correct uri for apple. The URI in a file object for iphone does not have the file:// prefix.
      //This gives invalid uri errors when trying to resolve.
      if(fileName.indexOf("file://") === -1 && window.device.platform !== "Win32NT" && window.device.platform !== "windows"){
        fileName = "file://" + fileName;
      }
      window.resolveLocalFileSystemURL(fileName, function(fileEntry){
        return cb(null, fileEntry);
      }, function(err){
        return cb(err);
      });
    }

    function _getFileEntry(fileName, size, params, cb) {
      var self = this;
      _checkEnv();
      if(typeof(fileName) === "string"){
        _requestFileSystem(PERSISTENT, size, function gotFS(fileSystem) {
          fileSystem.root.getFile(fileName, params, function gotFileEntry(fileEntry) {
            cb(null, fileEntry);
          }, function(err) {
            if (err.name === 'QuotaExceededError' || err.code === 10) {
              //this happens only on browser. request for 1 gb storage
              //TODO configurable from cloud
              var bigSize = 1024 * 1024 * 1024;
              _requestQuote(bigSize, function(err, bigSize) {
                _getFileEntry(fileName, size, params, cb);
              });
            } else {
              if(!appForm.utils.isPhoneGap()){
                return cb(err);
              } else {
                _resolveFile(fileName, cb);
              }
            }
          });
        }, function() {
          cb('Failed to requestFileSystem');
        });
      } else {
        if(typeof(cb) === "function"){
          cb("Expected file name to be a string but was " + fileName);
        }
      }
    }

    function _requestQuote(size, cb) {
        if (navigator.webkitPersistentStorage) {
            //webkit browser
            navigator.webkitPersistentStorage.requestQuota(size, function(size) {
                cb(null, size);
            }, function(err) {
                cb(err, 0);
            });
        } else {
            //PhoneGap does not need to do this.return directly.
            cb(null, size);
        }
    }

    function _checkEnv() {
        if (window.requestFileSystem) {
            _requestFileSystem = window.requestFileSystem;
            fileSystemAvailable = true;
        } else if (window.webkitRequestFileSystem) {
            _requestFileSystem = window.webkitRequestFileSystem;
            fileSystemAvailable = true;
        } else {
            fileSystemAvailable = false;
        }
        if (window.LocalFileSystem) {
            PERSISTENT = window.LocalFileSystem.PERSISTENT;
        } else if (window.PERSISTENT) {
            PERSISTENT = window.PERSISTENT;
        }
    }
    // debugger;
    _checkEnv();
    return module;
}(appForm.utils || {});

appForm.utils = function (module) {
  module.takePhoto = takePhoto;
  module.isPhoneGapCamAvailable = isPhoneGapAvailable;
  module.isHtml5CamAvailable = isHtml5CamAvailable;
  module.initHtml5Camera = initHtml5Camera;
  module.cancelHtml5Camera = cancelHtml5Camera;
  module.captureBarcode = captureBarcode;

  var isPhoneGap = false;
  var isHtml5 = false;
  var video = null;
  var canvas = null;
  var ctx = null;
  var localMediaStream = null;
  function isHtml5CamAvailable() {
    checkEnv();
    return isHtml5;
  }
  function isPhoneGapAvailable() {
    checkEnv();
    return isPhoneGap;
  }
  function initHtml5Camera(params, cb) {
    checkEnv();
    _html5Camera(params, cb);
  }

  function cancelHtml5Camera() {
    if (localMediaStream){
      if (localMediaStream.stop) {
        localMediaStream.stop();
      } else{
        var tracks = localMediaStream.getTracks();
        if(tracks && tracks.length!==0){
          tracks[0].stop();
        }
      }
      localMediaStream = null;
    }
  }
  function takePhoto(params, cb) {
    params = params || {};
    $fh.forms.log.d("Taking photo ", params, isPhoneGap);
    //use configuration
    var width =  params.targetWidth ? params.targetWidth : $fh.forms.config.get("targetWidth", 640);
    var height = params.targetHeight ? params.targetHeight : $fh.forms.config.get("targetHeight", 480);
    var quality= params.quality ? params.quality : $fh.forms.config.get("quality", 50);
    //For Safety, the default value of saving to photo album is true.
    var saveToPhotoAlbum = typeof(params.saveToPhotoAlbum) !== "undefined" ? params.saveToPhotoAlbum : $fh.forms.config.get("saveToPhotoAlbum");
    var encodingType = params.encodingType ? params.encodingType : $fh.forms.config.get("encodingType", 'jpeg');

    params.targetWidth = width;
    params.targetHeight = height;
    params.quality = quality;
    params.saveToPhotoAlbum = saveToPhotoAlbum;
    params.encodingType = encodingType;

    if ("undefined" === typeof(params.sourceType) && typeof(Camera) !== 'undefined') {
      params.sourceType = Camera.PictureSourceType.CAMERA;
    }

    if (isPhoneGap) {
      _phoneGapPhoto(params, cb);
    } else if (isHtml5) {
      snapshot(params, cb);
    } else {
      cb('Your device does not support camera.');
    }
  }
  function _phoneGapPhoto(params, cb){
    params.encodingType = params.encodingType === 'jpeg' ? Camera.EncodingType.JPEG : Camera.EncodingType.PNG;
    navigator.camera.getPicture(_phoneGapPhotoSuccess(cb), cb, {
      quality: params.quality,
      targetWidth: params.targetWidth,
      targetHeight: params.targetHeight,
      sourceType: params.sourceType,
      saveToPhotoAlbum: params.saveToPhotoAlbum,
      destinationType: Camera.DestinationType.FILE_URI,
      encodingType: params.encodingType
    });
  }
  function _phoneGapPhotoSuccess(cb) {
    return function (imageData) {
      var imageURI = imageData;
      cb(null, imageURI);
    };
  }
  function _html5Camera(params, cb) {
    $fh.forms.log.d("Taking photo _html5Camera", params, isPhoneGap);
    var width = params.targetWidth || $fh.forms.config.get("targetWidth");
    var height = params.targetHeight || $fh.forms.config.get("targetHeight");
    video.width = width;
    video.height = height;
    canvas.width = width;
    canvas.height = height;
    if (!localMediaStream) {
      navigator.getUserMedia({ video: true, audio:false }, function (stream) {
        video.src = window.URL.createObjectURL(stream);
        localMediaStream = stream;
        cb(null, video);
      }, cb);
    } else {
      $fh.forms.log.e('Media device was not released by browser.');
      cb('Media device occupied.');
    }
  }

  /**
   * Capturing a barcode using the PhoneGap barcode plugin
   */
  function _phoneGapBarcode(params, cb){
    //Checking for a cordova barcodeScanner plugin.
    if(window.cordova && window.cordova.plugins && window.cordova.plugins.barcodeScanner){
      cordova.plugins.barcodeScanner.scan(
        function (result) {
          $fh.forms.log.d("Barcode Found: " + JSON.stringify(result));
          return cb(null, result);
        },
        function (error) {
          $fh.forms.log.e("Scanning failed: " + error);
          cb("Scanning failed: " + error);
        }
      );
    } else {
      return cb("Barcode plugin not installed");
    }
  }

  /**
   * Capturing a barcode using a webcam and image processors.
   * TODO Not complete yet.
   * @param params
   * @param cb
   * @private
   */
  function _webBarcode(params, cb){
    //TODO Web barcode decoding not supported yet.
    $fh.forms.log.e("Web Barcode Decoding not supported yet.");
    return cb("Web Barcode Decoding not supported yet.");
  }

  function captureBarcode(params, cb){
    if(isPhoneGapAvailable()){
      _phoneGapBarcode(params,cb);
    } else {
      _webBarcode(params, cb);
    }
  }
  function checkEnv() {
    $fh.forms.log.d("Checking env");
    if (navigator.camera && navigator.camera.getPicture) {
      // PhoneGap
      isPhoneGap = true;
    } else if (_browserWebSupport()) {
      isHtml5 = true;
      video = document.createElement('video');
      video.autoplay = 'autoplay';
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d');
    } else {
      console.error('Cannot detect usable media API. Camera will not run properly on this device.');
    }
  }
  function _browserWebSupport() {
    if (navigator.getUserMedia) {
      return true;
    }
    if (navigator.webkitGetUserMedia) {
      navigator.getUserMedia = navigator.webkitGetUserMedia;
      return true;
    }
    if (navigator.mozGetUserMedia) {
      navigator.getUserMedia = navigator.mozGetUserMedia;
      return true;
    }
    if (navigator.msGetUserMedia) {
      navigator.getUserMedia = navigator.msGetUserMedia;
      return true;
    }
    return false;
  }

  function snapshot(params, cb) {
    $fh.forms.log.d("Snapshot ", params);
    if (localMediaStream) {
      ctx.drawImage(video, 0, 0, params.targetWidth, params.targetHeight);
      // "image/webp" works in Chrome.
      // Other browsers will fall back to image/png.
      var base64 = canvas.toDataURL('image/png');
      var imageData = ctx.getImageData(0, 0, params.targetWidth, params.targetHeight);

      if(params.cancelHtml5Camera){
        cancelHtml5Camera();
      }

      //Deciding whether to return raw image data or a base64 image.
      //rawData is mainly used for scanning for barcodes.
      if(params.rawData){
        return cb(null, {imageData: imageData, width: params.targetWidth, height: params.targetHeight, base64: base64});
      } else {
        return cb(null, base64);
      }
    } else {
      $fh.forms.log.e('Media resource is not available');
      cb('Resource not available');
    }
  }
  return module;
}(appForm.utils || {});

appForm.web = function (module) {

  module.uploadFile = function(url, fileProps, cb){
    $fh.forms.log.d("Phonegap uploadFile ", url, fileProps);
    var filePath = fileProps.localURL;

    if(!$fh.forms.config.isOnline()){
      $fh.forms.log.e("Phonegap uploadFile. Not Online.", url, fileProps);
      return cb("No Internet Connection Available.");
    }

    var success = function (r) {
      $fh.forms.log.d("upload to url ", url, " sucessful");
      r.response = r.response || {};
      if(typeof r.response === "string"){
        r.response = JSON.parse(r.response);
      }
      cb(null, r.response);
    };

    var fail = function (error) {
      $fh.forms.log.e("An error uploading a file has occurred: Code = " + error.code);
      $fh.forms.log.d("upload error source " + error.source);
      $fh.forms.log.d("upload error target " + error.target);
      cb(error);
    };

    var options = new FileUploadOptions();
    //important - empty fileName will cause file upload fail on WP!!
    options.fileName = (null == fileProps.name || "" === fileProps.name) ? "image.png" : fileProps.name;
    options.mimeType = fileProps.contentType ? fileProps.contentType : "application/octet-stream";
    options.httpMethod = "https";
    options.chunkedMode = true;
    options.fileKey = "file";

    //http://grandiz.com/phonegap-development/phonegap-file-transfer-error-code-3-solved/
    options.headers = {
      "Connection": "close"
    };

    $fh.forms.log.d("Beginning file upload ",url, options);
    var ft = new FileTransfer();
    ft.upload(filePath, encodeURI(url), success, fail, options);
  };

  module.downloadFile = function(url, fileMetaData, cb){
    $fh.forms.log.d("Phonegap downloadFile ", url, fileMetaData);
    var ft = new FileTransfer();

    if(!$fh.forms.config.isOnline()){
      $fh.forms.log.e("Phonegap downloadFile. Not Online.", url, fileMetaData);
      return cb("No Internet Connection Available.");
    }

    appForm.utils.fileSystem.getBasePath(function(err, basePath){
      if(err){
        $fh.forms.log.e("Error getting base path for file download: " + url);
        return cb(err);
      }

      function success(fileEntry){
        $fh.forms.log.d("File Download Completed Successfully. FilePath: " + fileEntry.fullPath);
        return cb(null, fileEntry.toURL());
      }

      function fail(error){
        $fh.forms.log.e("Error downloading file " + fileMetaData.fileName + " code: " + error.code);
        return cb("Error downloading file " + fileMetaData.fileName + " code: " + error.code);
      }

      if(fileMetaData.fileName){
        $fh.forms.log.d("File name for file " + fileMetaData.fileName + " found. Starting download");
        var fullPath = basePath + fileMetaData.fileName;
        ft.download(encodeURI(url), fullPath, success, fail, false, {headers: {
          "Connection": "close"
        }});
      } else {
        $fh.forms.log.e("No file name associated with the file to download");
        return cb("No file name associated with the file to download");
      }
    });
  };

  return module;
}(appForm.web || {});
appForm.web.ajax = function (module) {
  module = typeof $fh !== 'undefined' && $fh.__ajax ? $fh.__ajax : _myAjax;
  module.get = get;
  module.post = post;
  var _ajax = module;
  function _myAjax() {
  }
  function get(url, cb) {
    $fh.forms.log.d("Ajax get ", url);
    _ajax({
      'url': url,
      'type': 'GET',
      'dataType': 'json',
      'success': function (data, text) {
        $fh.forms.log.d("Ajax get", url, "Success");
        cb(null, data);
      },
      'error': function (xhr, status, err) {
        $fh.forms.log.e("Ajax get", url, "Fail", xhr, status, err);
        cb(xhr);
      }
    });
  }
  function post(url, body, cb) {
    $fh.forms.log.d("Ajax post ", url, body);
    var file = false;
    var formData;
    if (typeof body === 'object') {
      if (body instanceof File) {
        file = true;
        formData = new FormData();
        var name = body.name;
        formData.append(name, body);
        body = formData;
      } else {
        body = JSON.stringify(body);
      }
    }
    var param = {
        'url': url,
        'type': 'POST',
        'data': body,
        'dataType': 'json',
        'success': function (data, text) {
          $fh.forms.log.d("Ajax post ", url, " Success");
          cb(null, data);
        },
        'error': function (xhr, status, err) {
          $fh.forms.log.e("Ajax post ", url, " Fail ", xhr, status, err);
          cb(xhr);
        }
      };
    if (file === false) {
      param.contentType = 'application/json';
    }
    _ajax(param);
  }
  return module;
}(appForm.web.ajax || {});
appForm.stores = function (module) {
  module.Store = Store;
  function Store(name) {
    this.name = name;
  }
  Store.prototype.create = function (model, cb) {
    throw 'Create not implemented:' + this.name;
  };
  /**
     * Read a model data from store
     * @param  {[type]} model          [description]
     * @param  {[type]} cb(error, data);
     */
  Store.prototype.read = function (model, cb) {
    throw 'Read not implemented:' + this.name;
  };
  Store.prototype.update = function (model, cb) {
    throw 'Update not implemented:' + this.name;
  };
  Store.prototype.removeEntry = function (model, cb) {
    throw 'Delete not implemented:' + this.name;
  };
  Store.prototype.upsert = function (model, cb) {
    throw 'Upsert not implemented:' + this.name;
  };
  return module;
}(appForm.stores || {});
/**
 * Local storage stores a model's json definition persistently.
 */
appForm.stores = function(module) {
  //implementation
  var utils = appForm.utils;
  var fileSystem = utils.fileSystem;
  var _fileSystemAvailable = function() {};
  //placeholder
  function LocalStorage() {
    appForm.stores.Store.call(this, 'LocalStorage');
  }
  appForm.utils.extend(LocalStorage, appForm.stores.Store);
  //store a model to local storage
  LocalStorage.prototype.create = function(model, cb) {
    var key = utils.localId(model);
    model.setLocalId(key);
    this.update(model, cb);
  };
  //read a model from local storage
  LocalStorage.prototype.read = function(model, cb) {
    if(typeof(model) === "object"){
      if (model.get("_type") === "offlineTest"){
        return cb(null, {});
      }
    }

    var key = _getKey(model);
    if (key != null) {
      _fhData({
        'act': 'load',
        'key': key.toString()
      }, cb, cb);
    } else {
      //model does not exist in local storage if key is null.
      cb(null, null);
    }
  };
  //update a model
  LocalStorage.prototype.update = function(model, cb) {
    var key = _getKey(model);
    var data = model.getProps();
    var dataStr = JSON.stringify(data);
    _fhData({
      'act': 'save',
      'key': key.toString(),
      'val': dataStr
    }, cb, cb);
  };
  //delete a model
  LocalStorage.prototype.removeEntry = function(model, cb) {
    var key = _getKey(model);
    _fhData({
      'act': 'remove',
      'key': key.toString()
    }, cb, cb);
  };
  LocalStorage.prototype.upsert = function(model, cb) {
    var key = _getKey(model);
    if (key === null) {
      this.create(model, cb);
    } else {
      this.update(model, cb);
    }
  };
  LocalStorage.prototype.switchFileSystem = function(isOn) {
    _fileSystemAvailable = function() {
      return isOn;
    };
  };
  LocalStorage.prototype.defaultStorage = function() {
    _fileSystemAvailable = function() {
      return fileSystem.isFileSystemAvailable();
    };
  };
  LocalStorage.prototype.saveFile = function(fileName, fileToSave, cb){
    if(!_fileSystemAvailable()){
      return cb("File system not available");
    }

    _fhData({
      'act': 'save',
      'key': fileName,
      'val': fileToSave
    }, cb, cb);
  };
  LocalStorage.prototype.updateTextFile = function(key, dataStr, cb){
    _fhData({
      'act': 'save',
      'key': key,
      'val': dataStr
    }, cb, cb);
  };
  LocalStorage.prototype.readFile = function(fileName, cb){
    _fhData({
      'act': 'loadFile',
      'key': fileName
    }, cb, cb);
  };
  LocalStorage.prototype.readFileText = function(fileName, cb){
    _fhData({
      'act': 'load',
      'key': fileName
    }, cb, cb);
  };
  _fileSystemAvailable = function() {
    return fileSystem.isFileSystemAvailable();
  };

  function _getKey(key){
    return typeof(key.getLocalId) === "function" ? key.getLocalId() : key;
  }
  //use different local storage model according to environment
  function _fhData() {
    if (_fileSystemAvailable()) {
      _fhFileData.apply({}, arguments);
    } else {
      _fhLSData.apply({}, arguments);
    }
  }
  //use $fh data
  function _fhLSData(options, success, failure) {
    //allow for no $fh api in studio
    if(! $fh || ! $fh.data) {
      return success();
    }

    $fh.data(options, function (res) {
      if (typeof res === 'undefined') {
        res = {
          key: options.key,
          val: options.val
        };
      }
      //unify the interfaces
      if (options.act.toLowerCase() === 'remove') {
        return success(null, null);
      }
      success(null, res.val ? res.val : null);
    }, failure);
  }
  //use file system
  function _fhFileData(options, success, failure) {
    function fail(msg) {
      if (typeof failure !== 'undefined') {
        return failure(msg, {});
      } else {}
    }

    function filenameForKey(key, cb) {
      var appid = appForm.config.get("appId","unknownAppId");
      key = key + appid;
      utils.md5(key, function(err, hash) {
        if (err) {
          hash = key;
        }

        var filename = hash;

        if(key.indexOf("filePlaceHolder") === -1){
          filename += ".txt";
        }

        if (typeof navigator.externalstorage !== 'undefined') {
          navigator.externalstorage.enable(function handleSuccess(res) {
            var path = filename;
            if (res.path) {
              path = res.path;
              if (!path.match(/\/$/)) {
                path += '/';
              }
              path += filename;
            }
            filename = path;
            return cb(filename);
          }, function handleError(err) {
            return cb(filename);
          });
        } else {
          return cb(filename);
        }
      });
    }

    function save(key, value) {
      filenameForKey(key, function(hash) {
        fileSystem.save(hash, value, function(err, res) {
          if (err) {
            fail(err);
          } else {
            success(null, value);
          }
        });
      });
    }

    function remove(key) {
      filenameForKey(key, function(hash) {
        fileSystem.remove(hash, function(err) {
          if (err) {
            if (err.name === 'NotFoundError' || err.code === 1) {
              //same respons of $fh.data if key not found.
              success(null, null);
            } else {
              fail(err);
            }
          } else {
            success(null, null);
          }
        });
      });
    }

    function load(key) {
      filenameForKey(key, function(hash) {
        fileSystem.readAsText(hash, function(err, text) {
          if (err) {
            if (err.name === 'NotFoundError' || err.code === 1) {
              //same respons of $fh.data if key not found.
              success(null, null);
            } else {
              fail(err);
            }
          } else {
            success(null, text);
          }
        });
      });
    }

    function loadFile(key) {
      filenameForKey(key, function(hash) {
        fileSystem.readAsFile(hash, function(err, file) {
          if (err) {
            if (err.name === 'NotFoundError' || err.code === 1) {
              //same respons of $fh.data if key not found.
              success(null, null);
            } else {
              fail(err);
            }
          } else {
            success(null, file);
          }
        });
      });
    }

    if (typeof options.act === 'undefined') {
      return load(options.key);
    } else if (options.act === 'save') {
      return save(options.key, options.val);
    } else if (options.act === 'remove') {
      return remove(options.key);
    } else if (options.act === 'load') {
      return load(options.key);
    } else if (options.act === 'loadFile') {
      return loadFile(options.key);
    } else {
      if (typeof failure !== 'undefined') {
        return failure('Action [' + options.act + '] is not defined', {});
      }
    }
  }
  module.localStorage = new LocalStorage();
  return module;
}(appForm.stores || {});
appForm.stores = function(module) {
  var Store = appForm.stores.Store;
  module.mBaaS = new MBaaS();

  function MBaaS() {
    Store.call(this, 'MBaaS');
  }
  appForm.utils.extend(MBaaS, Store);
  MBaaS.prototype.checkStudio = function() {
    return appForm.config.get("studioMode");
  };
  MBaaS.prototype.create = function(model, cb) {
    var self = this;
    if (self.checkStudio()) {
      cb("Studio mode mbaas not supported");
    } else {
      var url = _getUrl(model);
      if(self.isFileAndPhoneGap(model)){
        appForm.web.uploadFile(url, model.getProps(), cb);
      } else {
        appForm.web.ajax.post(url, model.getProps(), cb);
      }
    }
  };
  MBaaS.prototype.isFileAndPhoneGap = function(model){
    var self = this;
    return self.isFileTransfer(model) && self.isPhoneGap();
  };
  MBaaS.prototype.isFileTransfer = function(model){
    return (model.get("_type") === "fileSubmission" || model.get("_type") === "base64fileSubmission" || model.get("_type") === "fileSubmissionDownload");
  };
  MBaaS.prototype.isPhoneGap = function(){
    return (typeof window.Phonegap !== "undefined" || typeof window.cordova !== "undefined");
  };
  MBaaS.prototype.read = function(model, cb) {
    var self = this;
    if (self.checkStudio()) {
      cb("Studio mode mbaas not supported");
    } else {
      if (model.get("_type") === "offlineTest") {
        cb("offlinetest. ignore");
      } else {
        var url = _getUrl(model);

        if(self.isFileTransfer(model) && self.isPhoneGap()){
          appForm.web.downloadFile(url, model.getFileMetaData(), cb);
        }
        else if(self.isFileTransfer(model)) {//Trying to download a file without phone. No need as the direct web urls can be used
          return cb(null, model.getRemoteFileURL());
        }
        else {
          appForm.web.ajax.get(url, cb);
        }
      }
    }
  };
  MBaaS.prototype.update = function(model, cb) {};
  MBaaS.prototype["delete"] = function(model, cb) {};
  //@Deprecated use create instead
  MBaaS.prototype.completeSubmission = function(submissionToComplete, cb) {
    if (this.checkStudio()) {
      return cb("Studio mode mbaas not supported");
    }
    var url = _getUrl(submissionToComplete);
    appForm.web.ajax.post(url, {}, cb);
  };
  MBaaS.prototype.submissionStatus = function(submission, cb) {
    if (this.checkStudio()) {
      return cb("Studio mode mbaas not supported");
    }
    var url = _getUrl(submission);
    appForm.web.ajax.get(url, cb);
  };
  MBaaS.prototype.isOnline = function(cb){
    var host = appForm.config.getCloudHost();
    var url = host + appForm.config.get('statusUrl', "/sys/info/ping");

    appForm.web.ajax.get(url, function(err){
      if(err){
        $fh.forms.log.e("Online status ajax ", err);
        return cb(false);
      } else {
        $fh.forms.log.d("Online status ajax success");
        return cb(true);
      }
    });
  };

  function _getUrl(model) {
    $fh.forms.log.d("_getUrl ", model);
    var type = model.get('_type');
    var host = appForm.config.getCloudHost();
    var mBaaSBaseUrl = appForm.config.get('mbaasBaseUrl');
    var formUrls = appForm.config.get('formUrls');
    var relativeUrl = "";
    if (formUrls[type]) {
      relativeUrl = formUrls[type];
    } else {
      $fh.forms.log.e('type not found to get url:' + type);
    }
    var url = host + mBaaSBaseUrl + relativeUrl;
    var props = {};
    props.appId = appForm.config.get('appId');
    //Theme and forms do not require any parameters that are not in _fh
    switch (type) {
      case 'config':
        props.appid = model.get("appId");
        props.deviceId = model.get("deviceId");
        break;
      case 'form':
        props.formId = model.get('_id');
        break;
      case 'formSubmission':
        props.formId = model.getFormId();
        break;
      case 'fileSubmission':
        props.submissionId = model.getSubmissionId();
        props.hashName = model.getHashName();
        props.fieldId = model.getFieldId();
        break;
      case 'base64fileSubmission':
        props.submissionId = model.getSubmissionId();
        props.hashName = model.getHashName();
        props.fieldId = model.getFieldId();
        break;
      case 'submissionStatus':
        props.submissionId = model.get('submissionId');
        break;
      case 'completeSubmission':
        props.submissionId = model.get('submissionId');
        break;
      case 'formSubmissionDownload':
        props.submissionId = model.getSubmissionId();
        break;
      case 'fileSubmissionDownload':
        props.submissionId = model.getSubmissionId();
        props.fileGroupId = model.getFileGroupId();
        break;
      case 'offlineTest':
        return "http://127.0.0.1:8453";
    }
    for (var key in props) {
      url = url.replace(':' + key, props[key]);
    }
    return url;
  }
  return module;
}(appForm.stores || {});
appForm.stores = function (module) {
  var Store = appForm.stores.Store;
  //DataAgent is read only store
  module.DataAgent = DataAgent;
  module.dataAgent = new DataAgent(appForm.stores.mBaaS, appForm.stores.localStorage);
  //default data agent uses mbaas as remote store, localstorage as local store
  function DataAgent(remoteStore, localStore) {
    Store.call(this, 'DataAgent');
    this.remoteStore = remoteStore;
    this.localStore = localStore;
  }
  appForm.utils.extend(DataAgent, Store);
  /**
     * Read from local store first, if not exists, read from remote store and store locally
     * @param  {[type]}   model [description]
     * @param  {Function} cb    (err,res,isFromRemote)
     * @return {[type]}         [description]
     */
  DataAgent.prototype.read = function (model, cb) {
    $fh.forms.log.d("DataAgent read ", model);
    var that = this;
    this.localStore.read(model, function (err, locRes) {
      if (err || !locRes) {
        //local loading failed

        $fh.forms.log.d("Error reading model from localStore ", model, err);

        that.refreshRead(model, cb);
      } else {
        //local loading succeed
        cb(null, locRes, false);
      }
    });
  };
  /**
     * Read from remote store and store the content locally.
     * @param  {[type]}   model [description]
     * @param  {Function} cb    [description]
     * @return {[type]}         [description]
     */
  DataAgent.prototype.refreshRead = function (model, cb) {
    $fh.forms.log.d("DataAgent refreshRead ", model);
    var that = this;
    this.remoteStore.read(model, function (err, res) {
      if (err) {
        $fh.forms.log.e("Error reading model from remoteStore ", model, err);
        cb(err);
      } else {
        $fh.forms.log.d("Model refresh successfull from remoteStore ", model, res);
        //update model from remote response
        model.fromJSON(res);
        //update local storage for the model
        that.localStore.upsert(model, function () {
          var args = Array.prototype.slice.call(arguments, 0);
          args.push(true);
          cb.apply({}, args);
        });
      }
    });
  };

  /**
   * Attempt to run refresh read first, if failed, run read.
   * @param  {[type]}   model [description]
   * @param  {Function} cb    [description]
   * @return {[type]}         [description]
   */
  DataAgent.prototype.attemptRead=function(model,cb){
    $fh.forms.log.d("DataAgent attemptRead ", model);
    var self=this;


    self.checkOnlineStatus(function(online){
      if($fh.forms.config.isOnline()){
        self.refreshRead(model,function(err){
          if (err){
            self.read(model,cb);
          }else{
            cb.apply({},arguments);
          }
        });
      } else {
        self.read(model,cb);
      }
    });
  };

  /**
   * Check online status of the remote store.
   * @param  {Function} cb    [description]
   * @return {[type]}         [description]
   */
  DataAgent.prototype.checkOnlineStatus=function(cb){
    $fh.forms.log.d("DataAgent check online status ");
    var self=this;

    if(appForm.utils.isPhoneGap()){
      if(navigator.connection){
        if(navigator.connection.type && navigator.connection.type === Connection.NONE){
          //No connection availabile, no need to ping.
          $fh.forms.config.offline();
          return cb(false);
        }
      }
    }


    self.remoteStore.isOnline(function(online){
      if(online === false){
        $fh.forms.config.offline();
      } else {
        $fh.forms.config.online();
      }

      cb(null, online);
    });
  };
  return module;
}(appForm.stores || {});
appForm.models = function (module) {
  function Model(opt) {
    this.props = {
      '_id': null,
      '_type': null,
      '_ludid': null
    };
    this.utils = appForm.utils;
    this.events = {};
    if (typeof opt !== 'undefined') {
      for (var key in opt) {
        this.props[key] = opt[key];
      }
    }
    this.touch();
  }
  Model.prototype.on = function (name, func) {
    if (!this.events[name]) {
      this.events[name] = [];
    }
    if (this.events[name].indexOf(func) < 0) {
      this.events[name].push(func);
    }
  };
  Model.prototype.off = function (name, func) {
    if (this.events[name]) {
      if (this.events[name].indexOf(func) >= 0) {
        this.events[name].splice(this.events[name].indexOf(func), 1);
      }
    }
  };

  Model.prototype.getType = function(){
    return this.get('_type');
  };

  Model.prototype.clearEvents = function(){
    this.events = {};
  };
  Model.prototype.emit = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var eventName = args.shift();
    var funcs = this.events[eventName];

    var globalArgs = args.slice(0);

    if (funcs && funcs.length > 0) {
      for (var i = 0; i < funcs.length; i++) {
        var func = funcs[i];
        func.apply(this, args);
        //Also emitting a global event if the
        var type = this.getType();
        if(type){
          var globalEmitName = this.utils.generateGlobalEventName(type, eventName);
          globalArgs.unshift(globalEmitName);
          $fh.forms.emit.apply(this, globalArgs);
        }

      }
    }
  };
  Model.prototype.getProps = function () {
    return this.props;
  };
  Model.prototype.get = function (key, def) {
    return typeof this.props[key] === 'undefined' ? def : this.props[key];
  };
  Model.prototype.set = function (key, val) {
    this.props[key] = val;
  };
  Model.prototype.setLocalId = function (localId) {
    this.set('_ludid', localId);
  };
  Model.prototype.getLocalId = function () {
    return this.get('_ludid');
  };
  Model.prototype.toJSON = function () {
    var retJSON = {};
    for (var key in this.props) {
      retJSON[key]= this.props[key];
    }
    return retJSON;
  };
  Model.prototype.fromJSON = function (json) {
    if (typeof json === 'string') {
      this.fromJSONStr(json);
    } else {
      for (var key in json) {
        this.set(key, json[key]);
      }
    }
    this.touch();
  };
  Model.prototype.fromJSONStr = function (jsonStr) {
    try {
      var json = JSON.parse(jsonStr);
      this.fromJSON(json);
    } catch (e) {
      console.error("Error parsing JSON", e);
    }
  };

  Model.prototype.touch = function () {
    this.set('_localLastUpdate', appForm.utils.getTime());
  };
  Model.prototype.getLocalUpdateTimeStamp = function () {
    return this.get('_localLastUpdate');
  };
  Model.prototype.genLocalId = function () {
    return appForm.utils.localId(this);
  };
  /**
     * retrieve model from local or remote with data agent store.
     * @param {boolean} fromRemote optional true--force from remote
     * @param  {Function} cb (err,currentModel)
     * @return {[type]}      [description]
     */
  Model.prototype.refresh = function (fromRemote, cb) {
    var dataAgent = this.getDataAgent();
    var that = this;
    if (typeof cb === 'undefined') {
      cb = fromRemote;
      fromRemote = false;
    }
    if (fromRemote) {
      dataAgent.attemptRead(this, _handler);
    } else {
      dataAgent.read(this, _handler);
    }
    function _handler(err, res) {
      if (!err && res) {
        that.fromJSON(res);
        cb(null, that);
      } else {
        cb(err, that);
      }
    }
  };
  Model.prototype.attemptRefresh=function(cb){
    var dataAgent = this.getDataAgent();
    var self=this;
    dataAgent.attemptRead(this,function(err,res){
      if (!err && res){
        self.fromJSON(res);
        cb(null,self);
      }else{
        cb(err,self);
      }
    });
  };
  /**
     * Retrieve model from local storage store
     * @param  {Function} cb (err, curModel)
     * @return {[type]}      [description]
     */
  Model.prototype.loadLocal = function (cb) {
    var localStorage = appForm.stores.localStorage;
    var that = this;
    localStorage.read(this, function (err, res) {
      if (err) {
        cb(err);
      } else {
        if (res) {
          that.fromJSON(res);
        }
        cb(err, that);
      }
    });
  };
  /**
     * save current model to local storage store
     * @param  {Function} cb [description]
     * @return {[type]}      [description]
     */
  Model.prototype.saveLocal = function (cb) {
    var localStorage = appForm.stores.localStorage;
    localStorage.upsert(this, cb);
  };
  /**
     * Remove current model from local storage store
     * @param  {Function} cb [description]
     * @return {[type]}      [description]
     */
  Model.prototype.clearLocal = function (cb) {
    var localStorage = appForm.stores.localStorage;
    localStorage.removeEntry(this, cb);
  };
  Model.prototype.getDataAgent = function () {
    if (!this.dataAgent) {
      this.setDataAgent(appForm.stores.dataAgent);
    }
    return this.dataAgent;
  };
  Model.prototype.setDataAgent = function (dataAgent) {
    this.dataAgent = dataAgent;
  };
  module.Model = Model;
  return module;
}(appForm.models || {});
appForm.models = function(module) {
  var Model = appForm.models.Model;
  var online = true;
  var cloudHost = "notset";

  function Config() {
    Model.call(this, {
      '_type': 'config',
      "_ludid": "config"
    });

  }
  appForm.utils.extend(Config, Model);
  //call in appForm.init
  Config.prototype.init = function(config, cb) {
    if (config.studioMode) { //running in studio
      this.set("studioMode", true);
      this.fromJSON(config);
      cb();
    } else {
      this.set("studioMode", false);
      //load hard coded static config first
      this.staticConfig(config);
      //attempt to load config from mbaas then local storage.
      this.refresh(true, cb); 
    }
  };
  Config.prototype.isStudioMode = function(){
    return this.get("studioMode");
  };
  Config.prototype.refresh = function (fromRemote, cb) {
    var dataAgent = this.getDataAgent();
    var self = this;
    if (typeof cb === 'undefined') {
      cb = fromRemote;
      fromRemote = false;
    }

    function _handler(err, res) {
      var configObj = {};

      if (!err && res) {
        if(typeof(res) === "string"){
          try{
            configObj = JSON.parse(res);
          } catch(error){
            $fh.forms.log.e("Invalid json config defintion from remote", error);
            configObj = {};
            return cb(error, null);
          }
        } else {
          configObj = res;
        }

        self.set("defaultConfigValues", configObj);
        self.saveLocal(function(err, updatedConfigJSON){
          cb(err, self);
        });
      } else {
        cb(err, self);
      }
    }
    self.loadLocal(function(err, localConfig){
      if(err) {
        $fh.forms.log.e("Config loadLocal ", err);
      }

      dataAgent.remoteStore.read(self, _handler);
    });
  };
  Config.prototype.getCloudHost = function(){
    return cloudHost;  
  };
  Config.prototype.staticConfig = function(config) {
    var self = this;
    var defaultConfig = {"defaultConfigValues": {}, "userConfigValues": {}};
    //If user already has set values, don't want to overwrite them
    if(self.get("userConfigValues")){
      defaultConfig.userConfigValues = self.get("userConfigValues");
    }
    var appid = $fh && $fh.app_props ? $fh.app_props.appid : config.appid;
    var mode = $fh && $fh.app_props ? $fh.app_props.mode : 'dev';
    self.set('appId', appid);
    self.set('env', mode);

    if($fh && $fh._getDeviceId){
      self.set('deviceId', $fh._getDeviceId());
    } else {
      self.set('deviceId', "notset");
    }


    self._initMBaaS(config);
    //Setting default retry attempts if not set in the config
    if (!config) {
      config = {};
    }

    //config_admin_user can not be set by the user.
    if(config.config_admin_user){
      delete config.config_admin_user;
    }

    defaultConfig.defaultConfigValues = config;
    var staticConfig = {
      "sent_save_min": 5,
      "sent_save_max": 1000,
      "targetWidth": 640,
      "targetHeight": 480,
      "quality": 50,
      "debug_mode": false,
      "logger": false,
      "max_retries": 3,
      "timeout": 7,
      "log_line_limit": 5000,
      "log_email": "test@example.com",
      "log_level": 3,
      "log_levels": ["error", "warning", "log", "debug"],
      "config_admin_user": true,
      "picture_source": "both",
      "saveToPhotoAlbum": true,
      "encodingType": "jpeg",
      "sent_items_to_keep_list": [5, 10, 20, 30, 40, 50, 100]
    };

    for(var key in staticConfig){
      defaultConfig.defaultConfigValues[key] = staticConfig[key];
    }

    self.fromJSON(defaultConfig);
  };
  Config.prototype._initMBaaS = function(config) {
    var self = this;
    config = config || {};
    var cloud_props = $fh.cloud_props;
    var app_props = $fh.app_props;
    var mode = 'dev';
    if (app_props) {
      cloudHost = app_props.host;
    }
    if (cloud_props && cloud_props.hosts) {
      cloudHost = cloud_props.hosts.url;
    }

    if(typeof(config.cloudHost) === 'string'){
      cloudHost = config.cloudHost;
    }

    
    self.set('mbaasBaseUrl', '/mbaas');
    var appId = self.get('appId');
    self.set('formUrls', {
      'forms': '/forms/:appId',
      'form': '/forms/:appId/:formId',
      'theme': '/forms/:appId/theme',
      'formSubmission': '/forms/:appId/:formId/submitFormData',
      'fileSubmission': '/forms/:appId/:submissionId/:fieldId/:hashName/submitFormFile',
      'base64fileSubmission': '/forms/:appId/:submissionId/:fieldId/:hashName/submitFormFileBase64',
      'submissionStatus': '/forms/:appId/:submissionId/status',
      'formSubmissionDownload': '/forms/:appId/submission/:submissionId',
      'fileSubmissionDownload': '/forms/:appId/submission/:submissionId/file/:fileGroupId',
      'completeSubmission': '/forms/:appId/:submissionId/completeSubmission',
      'config': '/forms/:appid/config/:deviceId'
    });
    self.set('statusUrl', '/sys/info/ping');
  };
  Config.prototype.setOnline = function(){
    var wasOnline = online;
    online = true;

    if(!wasOnline){
      this.emit('online');
    }
  };
  Config.prototype.setOffline = function(){
    var wasOnline = online;
    online = false;

    if(wasOnline){
      this.emit('offline');  
    }
  };
  Config.prototype.isOnline = function(){
    var self = this;
    if(appForm.utils.isPhoneGap()){
      if(navigator.connection && navigator.connection.type){
        return online === true && navigator.connection.type !== Connection.NONE;
      } else {
        return online === true;
      }
    } else {
      return online === true;
    }

  };
  Config.prototype.isStudioMode = function(){
    return this.get("studioMode", false);
  };

  module.config = new Config();
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  function Forms() {
    Model.call(this, {
      '_type': 'forms',
      '_ludid': 'forms_list',
      'loaded': false
    });
  }
  appForm.utils.extend(Forms, Model);

  Forms.prototype.isFormUpdated = function (formModel) {
    var id = formModel.get('_id');
    var formLastUpdate = formModel.getLastUpdate();
    var formMeta = this.getFormMetaById(id);
    if (formMeta) {
      return formLastUpdate !== formMeta.lastUpdatedTimestamp;
    } else {
      //could have been deleted. leave it for now
      return false;
    }
  };
  Forms.prototype.setLocalId = function(){
    $fh.forms.log.e("Forms setLocalId. Not Permitted for Forms.");
  };
  Forms.prototype.getFormMetaById = function (formId) {
    $fh.forms.log.d("Forms getFormMetaById ", formId);
    var forms = this.getFormsList();
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      if (form._id === formId) {
        return form;
      }
    }
    $fh.forms.log.e("Forms getFormMetaById: No form found for id: ", formId);
    return null;
  };
  Forms.prototype.size = function () {
    return this.get('forms').length;
  };
  Forms.prototype.getFormsList = function () {
    return this.get('forms', []);
  };
  Forms.prototype.getFormIdByIndex = function (index) {
    $fh.forms.log.d("Forms getFormIdByIndex: ", index);
    return this.getFormsList()[index]._id;
  };
  module.forms = new Forms();
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  module.Form = Form;
  var _forms = {};
  //cache of all forms. single instance for 1 formid
  /**
     * [Form description]
     * @param {[type]}   params  {formId: string, fromRemote:boolean(false), rawMode:false, rawData:JSON}
     * @param {Function} cb         [description]
     */
  function Form(params, cb) {
    var that = this;
    var rawMode = params.rawMode || false;
    var rawData = params.rawData || null;
    var formId = params.formId;
    var fromRemote = params.fromRemote;
    $fh.forms.log.d("Form: ", rawMode, rawData, formId, fromRemote);

    if (typeof fromRemote === 'function' || typeof cb === 'function') {
      if (typeof fromRemote === 'function') {
        cb = fromRemote;
        fromRemote = false;
      }
    } else {
      return $fh.forms.log.e('a callback function is required for initialising form data. new Form (formId, [isFromRemote], cb)');
    }

    if (!formId) {
      return cb('Cannot initialise a form object without an id. id:' + formId, null);
    }


    Model.call(that, {
      '_id': formId,
      '_type': 'form'
    });
    that.set('_id', formId);
    that.setLocalId(that.genLocalId(formId));


    function loadFromLocal(){
      $fh.forms.log.d("Form: loadFromLocal ", rawMode, rawData, formId, fromRemote);
      if (_forms[formId]) {
        //found form object in mem return it.
        cb(null, _forms[formId]);
        return _forms[formId];
      }

      function processRawFormJSON(){
        that.fromJSON(rawData);
        that.initialise();

        _forms[that.getFormId()] = that;
        return cb(null, that);
      }

      if(rawData){
        return processRawFormJSON();
      } else {

        /**
         * No Form JSON object to process into Models, load the form from local
         * storage.
         */
        that.refresh(false, function(err, form){
          if(err){
            return cb(err);
          }

          form.initialise();

          _forms[formId] = form;
          return cb(null, form);
        });
      }
    }


    function loadFromRemote(){
      $fh.forms.log.d("Form: loadFromRemote", rawMode, rawData, formId, fromRemote);
      function checkForUpdate(form){
        $fh.forms.log.d("Form: checkForUpdate", rawMode, rawData, formId, fromRemote);
        form.refresh(false, function (err, obj) {
          if(err){
             $fh.forms.log.e("Error refreshing form from local: ", err);
          }
          if (appForm.models.forms.isFormUpdated(form)) {
            form.refresh(true, function (err, obj1) {
              if(err){
                return cb(err, null);
              }
              form.initialise();

              _forms[formId] = obj1;
              return cb(err, obj1);
            });
          } else {
            form.initialise();
            _forms[formId] = obj;
            cb(err, obj);
          }
        });
      }

      if (_forms[formId]) {
        $fh.forms.log.d("Form: loaded from cache", rawMode, rawData, formId, fromRemote);
        //found form object in mem return it.
        if(!appForm.models.forms.isFormUpdated(_forms[formId])){
          cb(null, _forms[formId]);
          return _forms[formId];
        }
      }

      checkForUpdate(that);
    }

    //Raw mode is for avoiding interaction with the mbaas
    if(rawMode === true){
      loadFromLocal();
    } else {
      loadFromRemote();
    }
  }
  appForm.utils.extend(Form, Model);
  Form.prototype.getLastUpdate = function () {
    $fh.forms.log.d("Form: getLastUpdate");
    return this.get('lastUpdatedTimestamp');
  };
  Form.prototype.genLocalId = function (formId) {
    formId = typeof(formId) === 'string' ? formId : this.get("_id", "");
    return "form_" + formId;
  };
  /**
     * Initiliase form json to objects
     * @return {[type]} [description]
     */
  Form.prototype.initialise = function () {
    this.filterAdminFields();
    this.initialisePage();
    this.initialiseFields();
    this.initialiseRules();
  };
  /**
   * Admin fields should not be part of the form.
   */
  Form.prototype.filterAdminFields = function(){
    var pages = this.getPagesDef();
    var newFieldRef = {};


    for(var pageIndex = 0; pageIndex < pages.length; pageIndex++){
      var page = pages[pageIndex];
      var pageFields = page.fields;
      var filteredFields = [];
      var fieldInPageIndex = 0;

      for(var fieldIndex = 0; fieldIndex < pageFields.length; fieldIndex++){
        var field = pageFields[fieldIndex];

        if(!field.adminOnly){
          newFieldRef[field._id] = {page: pageIndex, field: fieldInPageIndex};
          fieldInPageIndex++;
          filteredFields.push(field);
        }
      }

      pages[pageIndex].fields = filteredFields;
    }

    this.set("pages", pages);
    this.set("fieldRef", newFieldRef);
  };

  Form.prototype.initialiseFields = function () {
    $fh.forms.log.d("Form: initialiseFields");
    var fieldsRef = this.getFieldRef();
    this.fields = {};
    for (var fieldId in fieldsRef) {
      var fieldRef = fieldsRef[fieldId];
      var pageIndex = fieldRef.page;
      var fieldIndex = fieldRef.field;
      if (pageIndex === undefined || fieldIndex === undefined) {
        throw 'Corruptted field reference';
      }
      var fieldDef = this.getFieldDefByIndex(pageIndex, fieldIndex);
      if (fieldDef) {
        this.fields[fieldId] = new appForm.models.Field(fieldDef, this);
      } else {
        throw 'Field def is not found.';
      }
    }
  };
  Form.prototype.initialiseRules = function () {
    $fh.forms.log.d("Form: initialiseRules");
    this.rules = {};
    var pageRules = this.getPageRules();
    var fieldRules = this.getFieldRules();
    var constructors = [];
    for (var i = 0; i<pageRules.length ; i++) {
      var pageRule = pageRules[i];
      constructors.push({
        'type': 'page',
        'definition': pageRule
      });
    }
    for (i = 0; i<fieldRules.length; i++) {
      var fieldRule = fieldRules[i];
      constructors.push({
        'type': 'field',
        'definition': fieldRule
      });
    }
    for (i = 0; i<constructors.length ; i++) {
      var constructor = constructors[i];
      var ruleObj = new appForm.models.Rule(constructor);
      var fieldIds = ruleObj.getRelatedFieldId();
      for (var j = 0; j<fieldIds.length; j++) {
        var  fieldId = fieldIds[j];
        if (!this.rules[fieldId]) {
          this.rules[fieldId] = [];
        }
        this.rules[fieldId].push(ruleObj);
      }
    }
  };
  Form.prototype.getRulesByFieldId = function (fieldId) {
    $fh.forms.log.d("Form: getRulesByFieldId");
    return this.rules[fieldId];
  };
  Form.prototype.initialisePage = function () {
    $fh.forms.log.d("Form: initialisePage");
    var pages = this.getPagesDef();
    this.pages = [];
    for (var i = 0; i < pages.length; i++) {
      var pageDef = pages[i];
      var pageModel = new appForm.models.Page(pageDef, this);
      this.pages.push(pageModel);
    }
  };
  Form.prototype.getPageNumberByFieldId = function(fieldId){
    if(fieldId){
      return this.getFieldRef()[fieldId].page;
    } else {
      return null;
    }
  };
  Form.prototype.getPageModelList = function () {
    return this.pages;
  };
  Form.prototype.getName = function () {
    return this.get('name', '');
  };
  Form.prototype.getDescription = function () {
    return this.get('description', '');
  };
  Form.prototype.getPageRules = function () {
    return this.get('pageRules', []);
  };
  Form.prototype.getFieldRules = function () {
    return this.get('fieldRules', []);
  };
  Form.prototype.getFieldRef = function () {
    return this.get('fieldRef', {});
  };
  Form.prototype.getPagesDef = function () {
    return this.get('pages', []);
  };
  Form.prototype.getPageRef = function () {
    return this.get('pageRef', {});
  };
  Form.prototype.getFieldModelById = function (fieldId) {
    return this.fields[fieldId];
  };
  /**
   * Finding a field model by the Field Code specified in the studio if it exists
   * Otherwise return null;
   * @param code - The code of the field that is being searched for
   */
  Form.prototype.getFieldModelByCode = function(code){
    var self = this;
    if(!code || typeof(code) !== "string"){
      return null;
    }

    for(var fieldId in self.fields){
      var field = self.fields[fieldId];
      if(field.getCode() !== null && field.getCode() === code){
        return field;
      }
    }

    return null;
  };
  Form.prototype.getFieldDefByIndex = function (pageIndex, fieldIndex) {
    $fh.forms.log.d("Form: getFieldDefByIndex: ", pageIndex, fieldIndex);
    var pages = this.getPagesDef();
    var page = pages[pageIndex];
    if (page) {
      var fields = page.fields ? page.fields : [];
      var field = fields[fieldIndex];
      if (field) {
        return field;
      }
    }
    $fh.forms.log.e("Form: getFieldDefByIndex: No field found for page and field index: ", pageIndex, fieldIndex);
    return null;
  };
  Form.prototype.getPageModelById = function (pageId) {
    $fh.forms.log.d("Form: getPageModelById: ", pageId);
    var index = this.getPageRef()[pageId];
    if (typeof index === 'undefined') {
      $fh.forms.log.e('page id is not found in pageRef: ' + pageId);
    } else {
      return this.pages[index];
    }
  };
  Form.prototype.newSubmission = function () {
    $fh.forms.log.d("Form: newSubmission");
    return appForm.models.submission.newInstance(this);
  };
  Form.prototype.getFormId = function () {
    return this.get('_id');
  };
  Form.prototype.removeFromCache = function () {
    $fh.forms.log.d("Form: removeFromCache");
    if (_forms[this.getFormId()]) {
      delete _forms[this.getFormId()];
    }
  };
  Form.prototype.getFileFieldsId = function () {
    $fh.forms.log.d("Form: getFileFieldsId");
    var fieldsId = [];
    for (var fieldId in this.fields) {
      var field = this.fields[fieldId];
      if (field.getType() === 'file' || field.getType() === 'photo' || field.getType() === 'signature') {
        fieldsId.push(fieldId);
      }
    }
    return fieldsId;
  };

  Form.prototype.getRuleEngine = function () {
    $fh.forms.log.d("Form: getRuleEngine");
    if (this.rulesEngine) {
      return this.rulesEngine;
    } else {
      var formDefinition = this.getProps();
      this.rulesEngine = new appForm.RulesEngine(formDefinition);
      return this.rulesEngine;
    }
  };
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  module.FileSubmission = FileSubmission;
  function FileSubmission(fileData) {
    $fh.forms.log.d("FileSubmission ", fileData);
    Model.call(this, {
      '_type': 'fileSubmission',
      'data': fileData
    });
  }
  appForm.utils.extend(FileSubmission, Model);
  FileSubmission.prototype.loadFile = function (cb) {
    $fh.forms.log.d("FileSubmission loadFile");
    var fileName = this.getHashName();
    var that = this;
    appForm.stores.localStorage.readFile(fileName, function (err, file) {
      if (err) {
        $fh.forms.log.e("FileSubmission loadFile. Error reading file", fileName, err);
        cb(err);
      } else {
        $fh.forms.log.d("FileSubmission loadFile. File read correctly", fileName, file);
        that.fileObj = file;
        cb(null);
      }
    });
  };
  FileSubmission.prototype.getProps = function () {
    if(this.fileObj){
      $fh.forms.log.d("FileSubmissionDownload: file object found");
      return this.fileObj;
    } else {
      $fh.forms.log.e("FileSubmissionDownload: no file object found");
    }
  };
  FileSubmission.prototype.setSubmissionId = function (submissionId) {
    $fh.forms.log.d("FileSubmission setSubmissionId.", submissionId);
    this.set('submissionId', submissionId);
  };
  FileSubmission.prototype.getSubmissionId = function () {
    return this.get('submissionId');
  };
  FileSubmission.prototype.getHashName = function () {
    return this.get('data').hashName;
  };
  FileSubmission.prototype.getFieldId = function () {
    return this.get('data').fieldId;
  };
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  module.FileSubmissionDownload = FileSubmissionDownload;
  function FileSubmissionDownload(fileData) {
    $fh.forms.log.d("FileSubmissionDownload ", fileData);
    Model.call(this, {
      '_type': 'fileSubmissionDownload',
      'data': fileData
    });
  }
  appForm.utils.extend(FileSubmissionDownload, Model);
  FileSubmissionDownload.prototype.setSubmissionId = function (submissionId) {
    $fh.forms.log.d("FileSubmission setSubmissionId.", submissionId);
    this.set('submissionId', submissionId);
  };
  FileSubmissionDownload.prototype.getSubmissionId = function () {
    $fh.forms.log.d("FileSubmission getSubmissionId: ", this.get('submissionId'));
    return this.get('submissionId', "");
  };
  FileSubmissionDownload.prototype.getHashName = function () {
    $fh.forms.log.d("FileSubmission getHashName: ", this.get('data').hashName);
    return this.get('data', {}).hashName;
  };
  FileSubmissionDownload.prototype.getFieldId = function () {
    $fh.forms.log.d("FileSubmission getFieldId: ", this.get('data').fieldId);
    return this.get('data', {}).fieldId;
  };
  FileSubmissionDownload.prototype.getFileMetaData = function(){
    $fh.forms.log.d("FileSubmission getFileMetaData: ", this.get('data'));
    if(this.get('data')){
      $fh.forms.log.d("FileSubmission getFileMetaData: data found", this.get('data'));
    } else {
      $fh.forms.log.e("FileSubmission getFileMetaData: No data found");
    }
    return this.get('data', {});
  };
  FileSubmissionDownload.prototype.getFileGroupId = function(){
    $fh.forms.log.d("FileSubmission getFileGroupId: ", this.get('data'));
    return this.get('data', {}).groupId || "notset";
  };
  FileSubmissionDownload.prototype.getRemoteFileURL = function(){
    var self = this;
    $fh.forms.log.d("FileSubmission getRemoteFileURL: ");

    //RemoteFileUrl = cloudHost + /mbaas/forms/submission/:submissionId/file/:fileGroupId
    //Returned by the mbaas.
    function buildRemoteFileUrl(){
      var submissionId = self.getSubmissionId();
      var fileGroupId = self.getFileGroupId();
      var urlTemplate =  appForm.config.get('formUrls', {}).fileSubmissionDownload;
      if(urlTemplate){
        urlTemplate = urlTemplate.replace(":submissionId", submissionId);
        urlTemplate = urlTemplate.replace(":fileGroupId", fileGroupId);
        urlTemplate = urlTemplate.replace(":appId", appForm.config.get('appId', "notSet"));
        return appForm.models.config.getCloudHost() + "/mbaas" + urlTemplate;
      } else {
        return  "notset";
      }
    }

    return buildRemoteFileUrl();
  };
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  module.FormSubmission = FormSubmission;
  function FormSubmission(submissionJSON) {
    Model.call(this, {
      '_type': 'formSubmission',
      'data': submissionJSON
    });
  }
  appForm.utils.extend(FormSubmission, Model);
  FormSubmission.prototype.getProps = function () {
    return this.get('data');
  };
  FormSubmission.prototype.getFormId = function () {
    if(!this.get('data')){
      $fh.forms.log.e("No form data for form submission");
    }

    return this.get('data').formId;
  };
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  module.FormSubmissionComplete = FormSubmissionComplete;
  function FormSubmissionComplete(submissionTask) {
    Model.call(this, {
      '_type': 'completeSubmission',
      'submissionId': submissionTask.get('submissionId'),
      'localSubmissionId': submissionTask.get('localSubmissionId')
    });
  }
  appForm.utils.extend(FormSubmissionComplete, Model);
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  module.FormSubmissionDownload = FormSubmissionDownload;
  function FormSubmissionDownload(uploadTask) {
    Model.call(this, {
      '_type': 'formSubmissionDownload',
      'data': uploadTask
    });
  }
  appForm.utils.extend(FormSubmissionDownload, Model);
  FormSubmissionDownload.prototype.getSubmissionId = function () {
    return this.get('data').get("submissionId", "not-set");
  };
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  module.FormSubmissionStatus = FormSubmissionStatus;
  function FormSubmissionStatus(submissionTask) {
    Model.call(this, {
      '_type': 'submissionStatus',
      'submissionId': submissionTask.get('submissionId'),
      'localSubmissionId': submissionTask.get('localSubmissionId')
    });
  }
  appForm.utils.extend(FormSubmissionStatus, Model);
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var FileSubmission = appForm.models.FileSubmission;
  module.Base64FileSubmission = Base64FileSubmission;
  function Base64FileSubmission(fileData) {
    FileSubmission.call(this, fileData);
    this.set('_type', 'base64fileSubmission');
  }
  appForm.utils.extend(Base64FileSubmission, FileSubmission);
  return module;
}(appForm.models || {});
appForm.models = function(module) {
    var Model = appForm.models.Model;

    function Submissions() {
        Model.call(this, {
            '_type': 'submissions',
            '_ludid': 'submissions_list',
            'submissions': []
        });
    }
    appForm.utils.extend(Submissions, Model);
    Submissions.prototype.setLocalId = function() {
        $fh.forms.log.e("Submissions setLocalId. Not Permitted for submissions.");
    };
    /**
     * save a submission to list and store it immediately
     * @param  {[type]}   submission [description]
     * @param  {Function} cb         [description]
     * @return {[type]}              [description]
     */
    Submissions.prototype.saveSubmission = function(submission, cb) {
        $fh.forms.log.d("Submissions saveSubmission");
        var self = this;
        this.updateSubmissionWithoutSaving(submission);
        this.clearSentSubmission(function() {
            self.saveLocal(cb);
        });
    };
    Submissions.prototype.updateSubmissionWithoutSaving = function(submission) {
        $fh.forms.log.d("Submissions updateSubmissionWithoutSaving");
        var pruneData = this.pruneSubmission(submission);
        var localId = pruneData._ludid;
        if (localId) {
            var meta = this.findMetaByLocalId(localId);
            var submissions = this.get('submissions');
            if (meta) {
                //existed, remove the old meta and save the new one.
                submissions.splice(submissions.indexOf(meta), 1);
                submissions.push(pruneData);
            } else {
                // not existed, insert to the tail.
                submissions.push(pruneData);
            }
        } else {
            // invalid local id.
            $fh.forms.log.e('Invalid submission for localId:', localId, JSON.stringify(submission));
        }
    };
    Submissions.prototype.clearSentSubmission = function(cb) {
        $fh.forms.log.d("Submissions clearSentSubmission");
        var self = this;
        var maxSent = $fh.forms.config.get("max_sent_saved") ? $fh.forms.config.get("max_sent_saved") : $fh.forms.config.get("sent_save_min");
        var submissions = this.get("submissions");
        var sentSubmissions = this.getSubmitted();


        if (sentSubmissions.length > maxSent) {
            $fh.forms.log.d("Submissions clearSentSubmission pruning sentSubmissions.length>maxSent");
            sentSubmissions = sentSubmissions.sort(function(a, b) {
                if (Date(a.submittedDate) < Date(b.submittedDate)) {
                    return 1;
                } else {
                    return -1;
                }
            });
            var toBeRemoved = [];
            while (sentSubmissions.length > maxSent) {
                toBeRemoved.push(sentSubmissions.pop());
            }
            var count = toBeRemoved.length;
            for (var i = 0; i < toBeRemoved.length; i++) {
                var subMeta = toBeRemoved[i];
                self.getSubmissionByMeta(subMeta, function(err, submission) {
                    submission.clearLocal(function(err) {
                        if (err) {
                            $fh.forms.log.e("Submissions clearSentSubmission submission clearLocal", err);
                        }
                        count--;
                        if (count === 0) {
                            cb(null, null);
                        }
                    });
                });
            }
        } else {
            cb(null, null);
        }
    };
    Submissions.prototype.findByFormId = function(formId) {
        $fh.forms.log.d("Submissions findByFormId", formId);
        var rtn = [];
        var submissions = this.get('submissions');
        for (var i = 0; i < submissions.length; i++) {
            var obj = submissions[i];
            if (submissions[i].formId === formId) {
                rtn.push(obj);
            }
        }
        return rtn;
    };
    Submissions.prototype.getSubmissions = function() {
        return this.get('submissions');
    };
    Submissions.prototype.getSubmissionMetaList = Submissions.prototype.getSubmissions;
    //function alias


    //Getting A Submission Model By Local ID
    Submissions.prototype.getSubmissionByLocalId = function(localId, cb){
        var self = this;
        $fh.forms.log.d("Submissions getSubmissionByLocalId", localId);
        var submissionMeta = self.findMetaByLocalId(localId);
        if(!submissionMeta){
            return cb("No submissions for localId: " + localId);
        }

        self.getSubmissionByMeta(submissionMeta, cb);
    };

    //Getting A Submission Model By Remote ID
    Submissions.prototype.getSubmissionByRemoteId = function(remoteId, cb){
        var self = this;
        $fh.forms.log.d("Submissions getSubmissionByRemoteId", remoteId);
        var submissionMeta = self.findMetaByRemoteId(remoteId);
        if(!submissionMeta){
            return cb("No submissions for remoteId: " + remoteId);
        }

        self.getSubmissionByMeta(submissionMeta, cb);
    };

    Submissions.prototype.findMetaByLocalId = function(localId) {
        $fh.forms.log.d("Submissions findMetaByLocalId", localId);
        var submissions = this.get('submissions');
        for (var i = 0; i < submissions.length; i++) {
            var obj = submissions[i];
            if (submissions[i]._ludid === localId) {
                return obj;
            }
        }

        $fh.forms.log.e("Submissions findMetaByLocalId: No submissions for localId: ", localId);
        return null;
    };

    /**
     * Finding a submission object by it's remote Id
     * @param remoteId
     * @returns {*}
     */
    Submissions.prototype.findMetaByRemoteId = function(remoteId) {
        remoteId = remoteId || "";

        $fh.forms.log.d("Submissions findMetaByRemoteId: " + remoteId);
        var submissions = this.get('submissions');
        for (var i = 0; i < submissions.length; i++) {
            var obj = submissions[i];
            if (submissions[i].submissionId) {
                if (submissions[i].submissionId === remoteId) {
                    return obj;
                }
            }
        }

        return null;
    };
    Submissions.prototype.pruneSubmission = function(submission) {
        $fh.forms.log.d("Submissions pruneSubmission");
        var fields = [
            '_id',
            '_ludid',
            'status',
            'formName',
            'formId',
            '_localLastUpdate',
            'createDate',
            'submitDate',
            'deviceFormTimestamp',
            'errorMessage',
            'submissionStartedTimestamp',
            'submittedDate',
            'submissionId',
            'saveDate',
            'uploadStartDate'
        ];
        var data = submission.getProps();
        var rtn = {};
        for (var i = 0; i < fields.length; i++) {
            var key = fields[i];
            rtn[key] = data[key];
        }
        return rtn;
    };

    Submissions.prototype.clear = function(cb) {
        $fh.forms.log.d("Submissions clear");
        var that = this;
        this.clearLocal(function(err) {
            if (err) {
                $fh.forms.log.e(err);
                cb(err);
            } else {
                that.set("submissions", []);
                cb(null, null);
            }
        });
    };
    Submissions.prototype.getDrafts = function(params) {
        $fh.forms.log.d("Submissions getDrafts: ", params);
        if (!params) {
            params = {};
        }
        params.status = "draft";
        return this.findByStatus(params);
    };
    Submissions.prototype.getPending = function(params) {
        $fh.forms.log.d("Submissions getPending: ", params);
        if (!params) {
            params = {};
        }
        params.status = "pending";
        return this.findByStatus(params);
    };
    Submissions.prototype.getSubmitted = function(params) {
        $fh.forms.log.d("Submissions getSubmitted: ", params);
        if (!params) {
            params = {};
        }
        params.status = "submitted";
        return this.findByStatus(params);
    };
    Submissions.prototype.getError = function(params) {
        $fh.forms.log.d("Submissions getError: ", params);
        if (!params) {
            params = {};
        }
        params.status = "error";
        return this.findByStatus(params);
    };
    Submissions.prototype.getInProgress = function(params) {
        $fh.forms.log.d("Submissions getInProgress: ", params);
        if (!params) {
            params = {};
        }
        params.status = "inprogress";
        return this.findByStatus(params);
    };
    Submissions.prototype.getDownloaded = function(params) {
        $fh.forms.log.d("Submissions getDownloaded: ", params);
        if (!params) {
            params = {};
        }
        params.status = "downloaded";
        return this.findByStatus(params);
    };
    Submissions.prototype.findByStatus = function(params) {
        $fh.forms.log.d("Submissions findByStatus: ", params);
        if (!params) {
            params = {};
        }
        if (typeof params === "string") {
            params = {
                status: params
            };
        }
        if (params.status === null) {
            return [];
        }

        var status = params.status;
        var formId = params.formId;
        var sortField = params.sortField || "createDate";

        var submissions = this.get("submissions", []);
        var rtn = [];
        for (var i = 0; i < submissions.length; i++) {
            if (status.indexOf(submissions[i].status) > -1) {
                if (formId != null) {
                    if (submissions[i].formId === formId) {
                        rtn.push(submissions[i]);
                    }
                } else {
                    rtn.push(submissions[i]);
                }

            }
        }

        rtn = rtn.sort(function(a, b) {
            if (Date(a[sortField]) < Date(b[sortField])) {
                return -1;
            } else {
                return 1;
            }
        });

        return rtn;
    };
    /**
     * return a submission model object by the meta data passed in.
     * @param  {[type]}   meta [description]
     * @param  {Function} cb   [description]
     * @return {[type]}        [description]
     */
    Submissions.prototype.getSubmissionByMeta = function(meta, cb) {
        $fh.forms.log.d("Submissions getSubmissionByMeta: ", meta);
        var localId = meta._ludid;
        if (localId) {
            appForm.models.submission.fromLocal(localId, cb);
        } else {
            $fh.forms.log.e("Submissions getSubmissionByMeta: local id not found for retrieving submission.", localId, meta);
            cb("local id not found for retrieving submission");
        }
    };
    Submissions.prototype.removeSubmission = function(localId, cb) {
        $fh.forms.log.d("Submissions removeSubmission: ", localId);
        var index = this.indexOf(localId);
        if (index > -1) {
            this.get('submissions').splice(index, 1);
        }
        this.saveLocal(cb);
    };
    Submissions.prototype.indexOf = function(localId, cb) {
        $fh.forms.log.d("Submissions indexOf: ", localId);
        var submissions = this.get('submissions');
        for (var i = 0; i < submissions.length; i++) {
            var obj = submissions[i];
            if (submissions[i]._ludid === localId) {
                return i;
            }
        }
        return -1;
    };
    module.submissions = new Submissions();
    return module;
}(appForm.models || {});
appForm.models = function(module) {
  module.submission = {
    newInstance: newInstance,
    fromLocal: fromLocal
  };
  //implmenetation
  var _submissions = {};
  //cache in mem for single reference usage.
  var Model = appForm.models.Model;
  var statusMachine = {
    'new': [
      'draft',
      'pending'
    ],
    'draft': [
      'pending',
      'draft'
    ],
    'pending': [
      'inprogress',
      'error',
      'draft'
    ],
    'inprogress': [
      'pending',
      'error',
      'inprogress',
      'downloaded',
      'queued'
    ],
    'submitted': [],
    'error': [
      'draft',
      'pending',
      'error'
    ],
    'downloaded' : [],
    'queued' : ['error', 'submitted']
  };

  function newInstance(form, params) {
    params = params ? params : {};
    var sub = new Submission(form, params);

    if(params.submissionId){
      appForm.models.submissions.updateSubmissionWithoutSaving(sub);
    }
    return sub;
  }

  function fromLocal(localId, cb) {
    $fh.forms.log.d("Submission fromLocal: ", localId);
    if (_submissions[localId]) {
      $fh.forms.log.d("Submission fromLocal from cache: ", localId);
      //already loaded
      cb(null, _submissions[localId]);
    } else {
      //load from storage
      $fh.forms.log.d("Submission fromLocal not in cache. Loading from local storage.: ", localId);
      var submissionObject = new Submission();
      submissionObject.setLocalId(localId);
      submissionObject.loadLocal(function(err, submission) {
        if (err) {
          $fh.forms.log.e("Submission fromLocal. Error loading from local: ", localId, err);
          cb(err);
        } else {
          $fh.forms.log.d("Submission fromLocal. Load from local sucessfull: ", localId);
          if(submission.isDownloadSubmission()){
            return cb(null, submission);
          } else {
            submission.reloadForm(function(err, res) {
              if (err) {
                $fh.forms.log.e("Submission fromLocal. reloadForm. Error re-loading form: ", localId, err);
                cb(err);
              } else {
                $fh.forms.log.d("Submission fromLocal. reloadForm. Re-loading form successfull: ", localId);
                _submissions[localId] = submission;
                cb(null, submission);
              }
            });
          }

        }
      });
    }
  }

  function Submission(form, params) {
    params = params || {};
    $fh.forms.log.d("Submission: ", params);
    Model.call(this, {
      '_type': 'submission'
    });
    if (typeof form !== 'undefined' && form) {
      this.set('formName', form.get('name'));
      this.set('formId', form.get('_id'));
      this.set('deviceFormTimestamp', form.getLastUpdate());
      this.set('createDate', appForm.utils.getTime());
      this.set('timezoneOffset', appForm.utils.getTime(true));
      this.set('appId', appForm.config.get('appId'));
      this.set('appEnvironment', appForm.config.get('env'));
      this.set('appCloudName', '');
      this.set('comments', []);
      this.set('formFields', []);
      this.set('saveDate', null);
      this.set('submitDate', null);
      this.set('uploadStartDate', null);
      this.set('submittedDate', null);
      this.set('userId', null);
      this.set('filesInSubmission', []);
      this.set('deviceId', appForm.config.get('deviceId'));
      this.transactionMode = false;

      //Applying default values from the form definition.
      this.applyDefaultValues(form);
    } else {
      this.set('appId', appForm.config.get('appId'));
      if(params.submissionId){
        this.set('downloadSubmission', true);
        this.setRemoteSubmissionId(params.submissionId);
      } else {
        this.set('status', 'new');
      }
    }
    this.set('status', 'new');
    this.genLocalId();
    var localId = this.getLocalId();
    _submissions[localId] = this;
  }
  appForm.utils.extend(Submission, Model);
  /**
   * save current submission as draft
   * @return {[type]} [description]
   */
  Submission.prototype.saveDraft = function(cb) {
    $fh.forms.log.d("Submission saveDraft: ");
    var targetStatus = 'draft';
    var that = this;
    this.set('timezoneOffset', appForm.utils.getTime(true));
    this.set('saveDate', appForm.utils.getTime());
    this.changeStatus(targetStatus, function(err) {
      if (err) {
        return cb(err);
      } else {
        that.emit('savedraft');
        cb(null, null);
      }
    });
  };
  Submission.prototype.validateField = function(fieldId, cb) {
    $fh.forms.log.d("Submission validateField: ", fieldId);
    var that = this;
    this.getForm(function(err, form) {
      if (err) {
        cb(err);
      } else {
        var submissionData = that.getProps();
        var ruleEngine = form.getRuleEngine();
        ruleEngine.validateField(fieldId, submissionData, cb);
      }
    });
  };
  Submission.prototype.checkRules = function(cb) {
    $fh.forms.log.d("Submission checkRules: ");
    var self = this;
    this.getForm(function(err, form) {
      if (err) {
        cb(err);
      } else {
        var submission = self.getProps();
        var ruleEngine = form.getRuleEngine();
        ruleEngine.checkRules(submission, cb);
      }
    });
  };

  Submission.prototype.performValidation = function(cb){
    var self = this;
    self.getForm(function(err, form) {
      if (err) {
        $fh.forms.log.e("Submission submit: Error getting form ", err);
        return cb(err);
      }
      var ruleEngine = form.getRuleEngine();
      var submission = self.getProps();
      ruleEngine.validateForm(submission, cb);
    });
  };

  /**
   * Validate the submission only.
   */
  Submission.prototype.validateSubmission = function(cb){
    var self = this;

    self.performValidation(function(err, res){
      if(err){
        return cb(err);
      }
      var validation = res.validation;
      if (validation.valid) {
        return cb(null, validation.valid);
      } else {
        self.emit('validationerror', validation);
        cb(null, validation.valid);
      }
    });
  };

  /**
   * Function for removing any values from a submisson that in hidden fields.
   *
   * @param {function} cb  -- Callback function
   */
  Submission.prototype.removeHiddenFieldValues = function(cb) {
    var self = this;
    async.waterfall([
      function checkSubmissionRules(callback) {
        self.checkRules(callback);
      },
      function getForm(ruleState, callback) {
        self.getForm(function(err, formModel) {
          return callback(err, ruleState, formModel);
        });
      },
      function pruneHiddenFields(ruleState, formModel, callback) {
        //Getting hidden pages and fields.

        var actions = ruleState.actions;

        var ruleTypes = ["fields", "pages"];

        //For page and field rule actions, find the hidden fields.
        var allHiddenFieldIds = _.map(ruleTypes, function(ruleType) {
          var fieldIds = [];

          var hidden = _.map(actions[ruleType] || {}, function(ruleAction, fieldOrPageId) {
            if (ruleAction.action === 'hide') {
              return fieldOrPageId;
            } else {
              return null;
            }
          });

          //If it is a hidden page, need to check for all fields that are in the page.
          //All of these fields are considered hidden.
          if(ruleType === 'pages') {
            fieldIds = _.map(hidden, function(pageId) {
              var pageModel = formModel.getPageModelById(pageId) || {};

              return pageModel.fieldsIds;
            });
          } else {
            fieldIds = hidden;
          }

          return _.compact(_.flatten(fieldIds));
        });

        allHiddenFieldIds = _.flatten(allHiddenFieldIds);

        //Now remove any values from from the submission containing hidden fields
        async.forEachSeries(allHiddenFieldIds, function(fieldId, cb) {
          self.removeFieldValue(fieldId, null, cb);
        }, function(err){
          if(err) {
            $fh.forms.log.e("Error removing fields", err);
          }

          return callback(err);
        });

      }
    ], cb);
  };

  /**
   * submit current submission to remote
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  Submission.prototype.submit = function(cb) {
    var self = this;
    $fh.forms.log.d("Submission submit: ");
    var targetStatus = 'pending';

    self.set('timezoneOffset', appForm.utils.getTime(true));
    self.pruneNullValues();

    async.waterfall([
      function(callback) {
        self.removeHiddenFieldValues(callback);
      },
      function(callback) {
        self.pruneRemovedFields(callback);
      },
      function(callback) {
        self.performValidation(function(err, validationResult) {
          if (err) {
            $fh.forms.log.e("Submission submit validateForm: Error validating form ", err);
          }

          return callback(err, validationResult);
        });
      },
      function(validationResult, callback) {
        $fh.forms.log.d("Submission submit: validateForm. Completed result", validationResult);
        var validation = validationResult.validation || {};
        if (validation.valid) {
          $fh.forms.log.d("Submission submit: validateForm. Completed Form Valid", validationResult);
          self.set('submitDate', new Date());
          self.changeStatus(targetStatus, function(error) {
            if (error) {
              callback(error);
            } else {
              self.emit('submit');
              callback(null, null);
            }
          });
        } else {
          $fh.forms.log.d("Submission submit: validateForm. Completed Validation error", validationResult);
          self.emit('validationerror', validation);
          callback('Validation error');
        }
      }
    ], cb);
  };
  Submission.prototype.getUploadTask = function(cb) {
    var taskId = this.getUploadTaskId();
    if (taskId) {
      appForm.models.uploadManager.getTaskById(taskId, cb);
    } else {
      cb(null, null);
    }
  };
  Submission.prototype.getFormId = function(){
    return this.get("formId");
  };
  /**
   * If a submission is a download submission, the JSON definition of the form
   * that it was submitted against is contained in the submission.
   */
  Submission.prototype.getFormSubmittedAgainst = function(){
    return this.get("formSubmittedAgainst");
  };
  Submission.prototype.getDownloadTask = function(cb){
    var self = this;
    $fh.forms.log.d("getDownloadTask");
    if(self.isDownloadSubmission()){
      self.getUploadTask(cb);
    } else {
      if(cb && typeof(cb) === 'function'){
        $fh.forms.log.e("Submission is not a download submission");
        return cb("Submission is not a download submission");
      }
    }
  };
  Submission.prototype.cancelUploadTask = function(cb) {
    var targetStatus = 'submit';
    var that = this;
    appForm.models.uploadManager.cancelSubmission(this, function(err) {
      if (err) {
        $fh.forms.log.e(err);
      }
      that.changeStatus(targetStatus, cb);
    });
  };
  Submission.prototype.getUploadTaskId = function() {
    return this.get('uploadTaskId');
  };
  Submission.prototype.setUploadTaskId = function(utId) {
    this.set('uploadTaskId', utId);
  };
  Submission.prototype.isInProgress = function(){
    return this.get("status") === "inprogress";
  };
  Submission.prototype.isDownloaded = function(){
    return this.get("status") === "downloaded";
  };
  Submission.prototype.isSubmitted = function(){
    return this.get("status") === "submitted";
  };
  Submission.prototype.submitted = function(cb) {
    var self = this;
    if(self.isDownloadSubmission()){
      var errMsg = "Downloaded submissions should not call submitted function.";
      $fh.forms.log.e(errMsg);
      return cb(errMsg);
    }
    $fh.forms.log.d("Submission submitted called");

    var targetStatus = 'submitted';

    self.set('submittedDate', appForm.utils.getTime());
    self.changeStatus(targetStatus, function(err) {
      if (err) {
        $fh.forms.log.e("Error setting submitted status " + err);
        cb(err);
      } else {
        $fh.forms.log.d("Submitted status set for submission " + self.get('submissionId') + " with localId " + self.getLocalId());
        self.emit('submitted', self.get('submissionId'));
        cb(null, null);
      }
    });
  };
  Submission.prototype.queued = function(cb){
    var self = this;
    if(self.isDownloadSubmission()){
      var errMsg = "Downloaded submissions should not call queued function.";
      $fh.forms.log.e(errMsg);
      return cb(errMsg);
    }

     var targetStatus = 'queued';
     self.set('queuedDate', appForm.utils.getTime());
     self.changeStatus(targetStatus, function(err) {
      if (err) {
        $fh.forms.log.e("Error setting queued status " + err);
        cb(err);
      } else {
        $fh.forms.log.d("Queued status set for submission " + self.get('submissionId') + " with localId " + self.getLocalId());
        self.emit('queued', self.get('submissionId'));
        cb(null, self);
      }
    });
  };
  Submission.prototype.downloaded = function(cb){
    $fh.forms.log.d("Submission Downloaded called");
    var that = this;
    var targetStatus = 'downloaded';

    that.set('downloadedDate', appForm.utils.getTime());
    that.pruneNullValues();
    that.changeStatus(targetStatus, function(err) {
      if (err) {
        $fh.forms.log.e("Error setting downloaded status " + err);
        cb(err);
      } else {
        $fh.forms.log.d("Downloaded status set for submission " + that.get('submissionId') + " with localId " + that.getLocalId());
        that.emit('downloaded', that.get('submissionId'));
        cb(null, that);
      }
    });
  };


  /**
   * Submission.prototype.pruneNullValues - Pruning null values from the submission
   *
   * @return {type}  description
   */
  Submission.prototype.pruneNullValues = function(){
    var formFields = this.getFormFields();

    for(var formFieldIndex = 0; formFieldIndex < formFields.length; formFieldIndex++){
      formFields[formFieldIndex].fieldValues = formFields[formFieldIndex].fieldValues || [];
      formFields[formFieldIndex].fieldValues = formFields[formFieldIndex].fieldValues.filter(function(fieldValue){
        return fieldValue !== null && typeof(fieldValue) !== "undefined";
      });
    }

    this.setFormFields(formFields);
  };

  /**
   * Submission.prototype.pruneRemovedFields - Pruning fields that have been deleted or removed from the form
   *
   * @return {type}  description
   */
  Submission.prototype.pruneRemovedFields = function(cb) {
    var that = this;
    var formFields = this.getFormFields();
    var newFields = [];
    var filesTobeRemoved = [];
    this.getForm(function(err, form) {
      if (err) {
        return cb(err);
      }
      //Loop and push matching fields
      _.each(formFields, function(field) {
        var fieldId = field.fieldId;
        if (form.fields.hasOwnProperty(fieldId)) {
          newFields.push(field);
        } else {
          //Only push field ID
          filesTobeRemoved.push(fieldId);
        }
      });

      //Delete files any left over files.
      async.forEach(filesTobeRemoved, function(fieldId, callback) {
        that.removeFieldValue(fieldId, null, callback);
      }, function(err) {
        //Update new set of formFields after deleting files
        that.set('formFields', newFields);
        cb(err);
      });
    });
  };


  /**
   *
   * Applying default values to a submission based on the form assigned to it.
   *
   * @param form - The form model to apply default values from
   */
  Submission.prototype.applyDefaultValues = function(form) {
    var formFields = this.getFormFields();

    //Have the form, need to apply default values to each of the fields.
    _.each(form.fields, function(field, fieldId) {
      var defaultValue = field.getDefaultValue();

      //No default values for this field, don't need to do anything.
      if(!defaultValue) {
        return;
      }

      var formFieldEntry = _.findWhere(formFields, {fieldId: fieldId});

      //If there is already an entry for this field, don't apply default values
      //Otherwise, create a new entry and add the default values.
      if(!formFieldEntry) {
        formFields.push({
          fieldId: fieldId,
          fieldValues: [defaultValue]
        });
      }

    });
  };

  //joint form id and submissions timestamp.
  Submission.prototype.genLocalId = function() {
    var lid = appForm.utils.localId(this);
    var formId = this.get('formId') || Math.ceil(Math.random() * 100000);
    this.setLocalId(formId + '_' + lid);
  };
  /**
   * change status and save the submission locally and register to submissions list.
   * @param {[type]} status [description]
   */
  Submission.prototype.changeStatus = function(status, cb) {
    if (this.isStatusValid(status)) {
      var that = this;
      this.set('status', status);
      this.saveToList(function(err) {
        if (err) {
          $fh.forms.log.e(err);
        }
      });
      this.saveLocal(cb);
    } else {
      $fh.forms.log.e('Target status is not valid: ' + status);
      cb('Target status is not valid: ' + status);
    }
  };
  Submission.prototype.upload = function(cb) {
    var targetStatus = "inprogress";
    var self = this;
    if (this.isStatusValid(targetStatus)) {
      this.set("status", targetStatus);
      this.set("uploadStartDate", appForm.utils.getTime());
      appForm.models.submissions.updateSubmissionWithoutSaving(this);
      appForm.models.uploadManager.queueSubmission(self, function(err, ut) {
        if (err) {
          cb(err);
        } else {
          ut.set("error", null);
          ut.saveLocal(function(err) {
            if (err) {
              $fh.forms.log.e("Error saving upload task: " + err);
            }
          });
          self.emit("inprogress", ut);
          ut.on("progress", function(progress) {
            $fh.forms.log.d("Emitting upload progress for submission: " + self.getLocalId() + JSON.stringify(progress));
            self.emit("progress", progress);
          });
          cb(null, ut);
        }
      });
    } else {
      return cb("Invalid Status to upload a form submission.");
    }
  };
  Submission.prototype.download = function(cb){
    var that = this;
    $fh.forms.log.d("Starting download for submission: " + that.getLocalId());
    var targetStatus = "pending";
    if(this.isStatusValid(targetStatus)){
      this.set("status", targetStatus);
      targetStatus = "inprogress";
      if(this.isStatusValid(targetStatus)){
        this.set("status", targetStatus);
        //Status is valid, add the submission to the
        appForm.models.uploadManager.queueSubmission(that, function(err, downloadTask) {
          if(err){
            return cb(err);
          }
          downloadTask.set("error", null);
          downloadTask.saveLocal(function(err) {
            if (err) {
              $fh.forms.log.e("Error saving download task: " + err);
            }
          });
          that.emit("inprogress", downloadTask);
          downloadTask.on("progress", function(progress) {
            $fh.forms.log.d("Emitting download progress for submission: " + that.getLocalId() + JSON.stringify(progress));
            that.emit("progress", progress);
          });
          return cb(null, downloadTask);
        });
      } else {
        return cb("Invalid Status to dowload a form submission");
      }
    } else {
      return cb("Invalid Status to download a form submission.");
    }
  };
  Submission.prototype.saveToList = function(cb) {
    appForm.models.submissions.saveSubmission(this, cb);
  };
  Submission.prototype.error = function(errorMsg, cb) {
    this.set('errorMessage', errorMsg);
    var targetStatus = 'error';
    this.changeStatus(targetStatus, cb);
    this.emit('error', errorMsg);
  };
  Submission.prototype.getStatus = function() {
    return this.get('status');
  };
  Submission.prototype.getErrorMessage = function(){
    return this.get('errorMessage', 'No Error');
  };
  /**
   * check if a target status is valid
   * @param  {[type]}  targetStatus [description]
   * @return {Boolean}              [description]
   */
  Submission.prototype.isStatusValid = function(targetStatus) {
    $fh.forms.log.d("isStatusValid. Target Status: " + targetStatus + " Current Status: " + this.get('status').toLowerCase());
    var status = this.get('status').toLowerCase();
    var nextStatus = statusMachine[status];
    if (nextStatus.indexOf(targetStatus) > -1) {
      return true;
    } else {
      this.set('status', 'error');
      return false;
    }
  };
  Submission.prototype.addComment = function(msg, user) {
    var now = appForm.utils.getTime();
    var ts = now.getTime();
    var newComment = {
      'madeBy': typeof user === 'undefined' ? '' : user.toString(),
      'madeOn': now,
      'value': msg,
      'timeStamp': ts
    };
    this.getComments().push(newComment);
    return ts;
  };
  Submission.prototype.getComments = function() {
    return this.get('comments');
  };
  Submission.prototype.removeComment = function(timeStamp) {
    var comments = this.getComments();
    for (var i = 0; i < comments.length; i++) {
      var comment = comments[i];
      if (comment.timeStamp === timeStamp) {
        comments.splice(i, 1);
        return;
      }
    }
  };

  Submission.prototype.populateFilesInSubmission = function() {
    var self = this;
    var tmpFileNames = [];

    var submissionFiles = self.getSubmissionFiles();
    for (var fieldValIndex = 0; fieldValIndex < submissionFiles.length; fieldValIndex++) {
      if(submissionFiles[fieldValIndex].fileName){
        tmpFileNames.push(submissionFiles[fieldValIndex].fileName);
      } else if(submissionFiles[fieldValIndex].hashName){
        tmpFileNames.push(submissionFiles[fieldValIndex].hashName);
      }
    }

    self.set("filesInSubmission", submissionFiles);
  };

  Submission.prototype.getSubmissionFiles = function() {
    var self = this;
    $fh.forms.log.d("In getSubmissionFiles: " + self.getLocalId());
    var submissionFiles = [];

    var formFields = self.getFormFields();

    for (var formFieldIndex = 0; formFieldIndex < formFields.length; formFieldIndex++) {
      var tmpFieldValues = formFields[formFieldIndex].fieldValues || [];
      for (var fieldValIndex = 0; fieldValIndex < tmpFieldValues.length; fieldValIndex++) {
        if(tmpFieldValues[fieldValIndex] && tmpFieldValues[fieldValIndex].fileName){
          submissionFiles.push(tmpFieldValues[fieldValIndex]);
        } else if(tmpFieldValues[fieldValIndex] && tmpFieldValues[fieldValIndex].hashName){
          submissionFiles.push(tmpFieldValues[fieldValIndex]);
        }
      }

    }

    return submissionFiles;
  };

  /**
   * Add a value to submission.
   * This will not cause the field been validated.
   * Validation should happen:
   * 1. onblur (field value)
   * 2. onsubmit (whole submission json)
   *
   * @param {[type]} params   {"fieldId","value","index":optional}
   * @param {} cb(err,res) callback function when finished
   * @return true / error message
   */
  Submission.prototype.addInputValue = function(params, cb) {
    $fh.forms.log.d("Adding input value: ", JSON.stringify(params || {}));
    var that = this;
    var fieldId = params.fieldId;
    var inputValue = params.value;
    var index = params.index === undefined ? -1 : params.index;

    if(!fieldId){
      return cb("Invalid parameters. fieldId is required");
    }

    //Transaction entries are not saved to memory, they are only saved when the transaction has completed.
    function processTransaction(form, fieldModel){
      if (!that.tmpFields[fieldId]) {
        that.tmpFields[fieldId] = [];
      }

      params.isStore = false;//Don't store the files until the transaction is complete
      fieldModel.processInput(params, function(err, result) {
        if (err) {
          return cb(err);
        } else {
          if (index > -1) {
            that.tmpFields[fieldId][index] = result;
          } else {
            that.tmpFields[fieldId].push(result);
          }

          return cb(null, result);
        }
      });
    }

    //Direct entries are saved immediately to local storage when they are input.
    function processDirectStore(form, fieldModel){
      var target = that.getInputValueObjectById(fieldId);

      //File already exists for this input, overwrite rather than create a new file
      //If pushing the value to the end of the list, then there will be no previous value
      if(index > -1 && target.fieldValues[index]){
        if(typeof(target.fieldValues[index].hashName) === "string"){
          params.previousFile = target.fieldValues[index];
        } else {
          params.previousValue = target.fieldValues[index];
        }
      }

      fieldModel.processInput(params, function(err, result) {
        if (err) {
          return cb(err);
        } else {
          if (index > -1) {
            target.fieldValues[index] = result;
          } else {
            target.fieldValues.push(result);
          }

          if(result && typeof(result.hashName) === "string"){
            that.pushFile(result.hashName);
          }

          return cb(null, result);
        }
      });
    }

    function gotForm(err, form) {
      var fieldModel = form.getFieldModelById(fieldId);

      if(!fieldModel){
        return cb("No field model found for fieldId " + fieldId);
      }

      if (that.transactionMode) {
        processTransaction(form, fieldModel);
      } else {
        processDirectStore(form, fieldModel);
      }
    }

    this.getForm(gotForm);
  };
  Submission.prototype.pushFile = function(hashName){
    var subFiles = this.get('filesInSubmission', []);
    if(typeof(hashName) === "string"){
      if(subFiles.indexOf(hashName) === -1){
        subFiles.push(hashName);
        this.set('filesInSubmission', subFiles);
      }
    }
  };
  Submission.prototype.removeFileValue = function(hashName){
    var subFiles = this.get('filesInSubmission', []);
    if(typeof(hashName) === "string" && subFiles.indexOf(hashName) > -1){
      subFiles.splice(subFiles.indexOf(hashName),1);
      this.set('filesInSubmission', subFiles);
    }
  };
  Submission.prototype.getInputValueByFieldId = function(fieldId, cb) {
    var self = this;
    var values = this.getInputValueObjectById(fieldId).fieldValues;
    this.getForm(function(err, form) {
      var fieldModel = form.getFieldModelById(fieldId);
      fieldModel.convertSubmission(values, cb);
    });
  };
  /**
   * Reset submission
   * @return {[type]} [description]
   */
  Submission.prototype.reset = function() {
    var self = this;
    self.clearLocalSubmissionFiles(function(err){
      self.set('formFields', []);
    });
  };
  Submission.prototype.isDownloadSubmission = function(){
    return this.get("downloadSubmission") === true;
  };

  Submission.prototype.getSubmissionFile = function(fileName, cb){
    appForm.stores.localStorage.readFile(fileName, cb);
  };
  Submission.prototype.clearLocalSubmissionFiles = function(cb) {
    $fh.forms.log.d("In clearLocalSubmissionFiles");
    var self = this;
    var filesInSubmission = self.get("filesInSubmission", []);
    $fh.forms.log.d("Files to clear ", filesInSubmission);
    var localFileName = "";

    for (var fileMetaObject in filesInSubmission) {
      $fh.forms.log.d("Clearing file " + filesInSubmission[fileMetaObject]);
      appForm.stores.localStorage.removeEntry(filesInSubmission[fileMetaObject], function(err) {
        if (err) {
          $fh.forms.log.e("Error removing files from " + err);
        }
      });
    }
    cb();
  };
  Submission.prototype.startInputTransaction = function() {
    this.transactionMode = true;
    this.tmpFields = {};
  };
  Submission.prototype.endInputTransaction = function(succeed) {
    this.transactionMode = false;
    var tmpFields = {};
    var fieldId = "";
    var valIndex = 0;
    var valArr = [];
    var val = "";
    if (succeed) {
      tmpFields = this.tmpFields;
      for (fieldId in tmpFields) {
        var target = this.getInputValueObjectById(fieldId);
        valArr = tmpFields[fieldId];
        for (valIndex = 0; valIndex < valArr.length; valIndex++) {
          val = valArr[valIndex];
          target.fieldValues.push(val);
          if(typeof(val.hashName) === "string"){
            this.pushFile(val.hashName);
          }
        }
      }
      this.tmpFields = {};
    } else {
      //clear any files set as part of the transaction
      tmpFields = this.tmpFields;
      this.tmpFields = {};
      for (fieldId in tmpFields) {
        valArr = tmpFields[fieldId];
        for (valIndex = 0; valIndex < valArr.length; valIndex++) {
          val = valArr[valIndex];
          if(typeof(val.hashName) === "string"){
            //This is a file, needs to be removed
            appForm.stores.localStorage.removeEntry(val.hashName, function(err){
              $fh.forms.log.e("Error removing file from transaction ", err);
            });
          }
        }
      }
    }
  };
  /**
   * remove an input value from submission
   * @param  {[type]} fieldId field id
   * @param  {[type]} index (optional) the position of the value will be removed if it is repeated field.
   * @param  {function} [Optional callback]
   * @return {[type]}         [description]
   */
  Submission.prototype.removeFieldValue = function(fieldId, index, callback) {
    callback = callback || function(){};
    var self = this;
    var targetArr = [];
    var valsRemoved = {};
    if (this.transactionMode) {
      targetArr = this.tmpFields.fieldId;
    } else {
      targetArr = this.getInputValueObjectById(fieldId).fieldValues;
    }
    //If no index is supplied, all values are removed.
    if (index === null || typeof index === 'undefined') {
      valsRemoved = targetArr.splice(0, targetArr.length);
    } else {
      if (targetArr.length > index) {
        valsRemoved = targetArr.splice(index, 1, null);
      }
    }

    //Clearing up any files from local storage.
    async.forEach(valsRemoved, function(valRemoved, cb){
      if(valRemoved && valRemoved.hashName){
        appForm.stores.localStorage.removeEntry(valRemoved.hashName, function(err){
          if(err){
            $fh.forms.log.e("Error removing file: ", err, valRemoved);
          } else {
            self.removeFileValue(valRemoved.hashName);
          }
          return cb(null, valRemoved);
        });
      } else {
        return cb();
      }
    }, function(err){
      callback(err);
    });
  };
  Submission.prototype.getInputValueObjectById = function(fieldId) {
    var formFields = this.getFormFields();
    for (var i = 0; i < formFields.length; i++) {
      var formField = formFields[i];

      if(formField.fieldId._id){
        if (formField.fieldId._id === fieldId) {
          return formField;
        }
      } else {
        if (formField.fieldId === fieldId) {
          return formField;
        }
      }
    }
    var newField = {
      'fieldId': fieldId,
      'fieldValues': []
    };
    formFields.push(newField);
    return newField;
  };
  /**
   * get form model related to this submission.
   * @return {[type]} [description]
   */
  Submission.prototype.getForm = function(cb) {
    var Form = appForm.models.Form;
    var formId = this.get('formId');

    if(formId){
      $fh.forms.log.d("FormId found for getForm: " + formId);
      new Form({
        'formId': formId,
        'rawMode': true
      }, cb);
    } else {
      $fh.forms.log.e("No form Id specified for getForm");
      return cb("No form Id specified for getForm");
    }
  };
  Submission.prototype.reloadForm = function(cb) {
    $fh.forms.log.d("Submission reload form");
    var Form = appForm.models.Form;
    var formId = this.get('formId');
    var self = this;
    new Form({
      formId: formId,
      'rawMode': true
    }, function(err, form) {
      if (err) {
        cb(err);
      } else {
        self.form = form;
        if (!self.get('deviceFormTimestamp', null)) {
          self.set('deviceFormTimestamp', form.getLastUpdate());
        }
        cb(null, form);
      }
    });
  };
  /**
   * Retrieve all file fields related value
   * If the submission has been downloaded, there is no gurantee that the form is  on-device.
   * @return {[type]} [description]
   */
  Submission.prototype.getFileInputValues = function(cb) {
    var self = this;
    self.getFileFieldsId(function(err, fileFieldIds){
      if(err){
        return cb(err);
      }
      return cb(null, self.getInputValueArray(fileFieldIds));
    });
  };


  /**
   * Submission.prototype.getFormFields - Get the form field input values
   *
   * @return {type}                   description
   */
  Submission.prototype.getFormFields = function(){
    return this.get("formFields", []);
  };

  /**
   * Submission.prototype.getFormFields - Set the form field input values
   *
   * @param  {boolean} includeNullValues flag on whether to include null values or not.
   * @return {type}                   description
   */
  Submission.prototype.setFormFields = function(values){
    return this.get("formFields", values);
  };

  Submission.prototype.getFileFieldsId = function(cb){
    var self = this;
    var formFieldIds = [];

    if(self.isDownloadSubmission()){
      //For Submission downloads, there needs to be a scan through the formFields param
      var formFields = self.getFormFields();

      for(var formFieldIndex = 0; formFieldIndex < formFields.length; formFieldIndex++){
        var formFieldEntry = formFields[formFieldIndex].fieldId || {};
        if(formFieldEntry.type === 'file' || formFieldEntry.type === 'photo'  || formFieldEntry.type === 'signature'){
          if(formFieldEntry._id){
            formFieldIds.push(formFieldEntry._id);
          }
        }
      }
      return cb(null, formFieldIds);
    } else {
      self.getForm(function(err, form){
        if(err){
          $fh.forms.log.e("Error getting form for getFileFieldsId" + err);
          return cb(err);
        }
        return cb(err, form.getFileFieldsId());
      });
    }
  };

  Submission.prototype.updateFileLocalURI = function(fileDetails, newLocalFileURI, cb){
    $fh.forms.log.d("updateFileLocalURI: " + newLocalFileURI);
    var self = this;
    fileDetails = fileDetails || {};

    if(fileDetails.fileName && newLocalFileURI){
      //Search for the file placeholder name.
      self.findFilePlaceholderFieldId(fileDetails.fileName, function(err, fieldDetails){
        if(err){
          return cb(err);
        }
        if(fieldDetails.fieldId){
          var tmpObj = self.getInputValueObjectById(fieldDetails.fieldId).fieldValues[fieldDetails.valueIndex];
          tmpObj.localURI = newLocalFileURI;
          self.getInputValueObjectById(fieldDetails.fieldId).fieldValues[fieldDetails.valueIndex] = tmpObj;
          self.saveLocal(cb);
        } else {
          $fh.forms.log.e("No file field matches the placeholder name " + fileDetails.fileName);
          return cb("No file field matches the placeholder name " + fileDetails.fileName);
        }
      });
    } else {
      $fh.forms.log.e("Submission: updateFileLocalURI : No fileName for submissionId : "+ JSON.stringify(fileDetails));
      return cb("Submission: updateFileLocalURI : No fileName for submissionId : "+ JSON.stringify(fileDetails));
    }
  };

  Submission.prototype.findFilePlaceholderFieldId = function(filePlaceholderName, cb){
    var self = this;
    var fieldDetails = {};
    self.getFileFieldsId(function(err, fieldIds){
      for (var i = 0; i< fieldIds.length; i++) {
        var fieldId = fieldIds[i];
        var inputValue = self.getInputValueObjectById(fieldId);
        for (var j = 0; j < inputValue.fieldValues.length; j++) {
          var tmpObj = inputValue.fieldValues[j];
          if (tmpObj) {
            if(tmpObj.fileName !== null && tmpObj.fileName === filePlaceholderName){
              fieldDetails.fieldId = fieldId;
              fieldDetails.valueIndex = j;
            }
          }
        }
      }
      return cb(null, fieldDetails);
    });
  };

  Submission.prototype.getInputValueArray = function(fieldIds) {
    var rtn = [];
    for (var i = 0; i< fieldIds.length; i++) {
      var  fieldId = fieldIds[i];
      var inputValue = this.getInputValueObjectById(fieldId);
      for (var j = 0; j < inputValue.fieldValues.length; j++) {
        var tmpObj = inputValue.fieldValues[j];
        if (tmpObj) {
          tmpObj.fieldId = fieldId;
          rtn.push(tmpObj);
        }
      }
    }
    return rtn;
  };
  Submission.prototype.clearLocal = function(cb) {
    var self = this;
    //remove from uploading list
    appForm.models.uploadManager.cancelSubmission(self, function(err, uploadTask) {
      if (err) {
        $fh.forms.log.e(err);
        return cb(err);
      }
      //remove from submission list
      appForm.models.submissions.removeSubmission(self.getLocalId(), function(err) {
        if (err) {
          $fh.forms.log.e(err);
          return cb(err);
        }
        self.clearLocalSubmissionFiles(function() {
          Model.prototype.clearLocal.call(self, function(err) {
            if (err) {
              $fh.forms.log.e(err);
              return cb(err);
            }
            cb(null, null);
          });
        });
      });
    });
  };
  Submission.prototype.getRemoteSubmissionId = function() {
    return this.get("submissionId") || this.get('_id');
  };
  Submission.prototype.setRemoteSubmissionId = function(submissionId){
    if(submissionId){
      this.set("submissionId", submissionId);
      this.set("_id", submissionId);
    }
  };
  return module;
}(appForm.models || {});

/**
 * Field model for form
 * @param  {[type]} module [description]
 * @return {[type]}        [description]
 */
appForm.models = function (module) {
  var Model = appForm.models.Model;
  function Field(opt, form) {
    Model.call(this, { '_type': 'field' });
    if (opt) {
      this.fromJSON(opt);
      this.genLocalId();
    }
    if (form) {
      this.form = form;
    }
  }
  appForm.utils.extend(Field, Model);
  Field.prototype.isRequired = function () {
    return this.get('required');
  };
  Field.prototype.getFieldValidation = function () {
    return this.getFieldOptions().validation || {};
  };
  Field.prototype.getFieldDefinition = function () {
    return this.getFieldOptions().definition || {};
  };
  Field.prototype.getMinRepeat = function () {
    var def = this.getFieldDefinition();
    return def.minRepeat || 1;
  };
  Field.prototype.getMaxRepeat = function () {
    var def = this.getFieldDefinition();
    return def.maxRepeat || 1;
  };
  Field.prototype.getFieldOptions = function () {
    return this.get('fieldOptions', {
      'validation': {},
      'definition': {}
    });
  };
  Field.prototype.getPhotoOptions = function(){
    var photoOptions = {
      "targetWidth" : null,
      "targetHeight" : null,
      "quality" : null,
      "saveToPhotoAlbum": null,
      "pictureSource": null,
      "encodingType": null
    };

    var fieldDef = this.getFieldDefinition();
    photoOptions.targetWidth = fieldDef.photoWidth;
    photoOptions.targetHeight = fieldDef.photoHeight;
    photoOptions.quality = fieldDef.photoQuality;
    photoOptions.saveToPhotoAlbum = fieldDef.saveToPhotoAlbum;
    photoOptions.pictureSource = fieldDef.photoSource;
    photoOptions.encodingType = fieldDef.photoType;

    return photoOptions;
  };
  Field.prototype.isRepeating = function () {
    return this.get('repeating', false);
  };
  /**
     * retrieve field type.
     * @return {[type]} [description]
     */
  Field.prototype.getType = function () {
    return this.get('type', 'text');
  };
  Field.prototype.getFieldId = function () {
    return this.get('_id', '');
  };
  Field.prototype.getName = function () {
    return this.get('name', 'unknown');
  };
  /**
   * Function to return the Field Code specified in the studio if it exists
   * otherwise return null.
   */
  Field.prototype.getCode = function(){
    return this.get('fieldCode', null);
  };
  Field.prototype.getHelpText = function () {
    return this.get('helpText', '');
  };

  /**
     * return default value for a field
     *
  */
  Field.prototype.getDefaultValue = function () {
    var def = this.getFieldDefinition();

    //If the field is a multichoice field, then the selected option will be set in the options list.
    if(this.isMultiChoiceField()) {
      return this.getDefaultMultiValue();
    } else {
      return def.defaultValue;
    }
  };

  /**
   * Function to get the selected values for a multichoice fields
   */
  Field.prototype.getDefaultMultiValue = function() {
    var fieldDefinition = this.getFieldDefinition();

    if(!fieldDefinition.options) {
      return null;
    }

    var selectedOptions = _.filter(fieldDefinition.options, function(option) {
      return option.checked;
    });

    //No default options were selected.
    if(_.isEmpty(selectedOptions)) {
      return null;
    }

    selectedOptions = _.pluck(selectedOptions, 'label');

    //Checkbox fields can have multiple inputs per field entry.
    if(this.isCheckboxField()) {
      return selectedOptions;
    } else {
      return _.first(selectedOptions);
    }
  };

  Field.prototype.isAdminField = function(){
    return this.get("adminOnly");
  };

  /**
   * Checking if a field is a checkbox, radio or dropdown field type.
   */
  Field.prototype.isMultiChoiceField = function() {
    return this.isCheckboxField() || this.isRadioField() || this.isDropdownField();
  };

  /**
   * Checking if a field is a checkboxes field type
   * @returns {boolean}
   */
  Field.prototype.isCheckboxField = function() {
    return this.get('type') === 'checkboxes';
  };

  /**
   * Checking if a field is a Radio field type
   * @returns {boolean}
   */
  Field.prototype.isRadioField = function() {
    return this.get('type') === 'radio';
  };

  /**
   * Checking if a field is a Dropdown field type
   * @returns {boolean}
   */
  Field.prototype.isDropdownField = function() {
    return this.get('type') === 'dropdown';
  };

  /**
     * Process an input value. convert to submission format. run field.validate before this
     * @param  {[type]} params {"value", "isStore":optional}
     * @param {cb} cb(err,res)
     * @return {[type]}           submission json used for fieldValues for the field
     */
  Field.prototype.processInput = function (params, cb) {
    var type = this.getType();
    var processorName = 'process_' + type;
    var inputValue = params.value;
    if (typeof inputValue === 'undefined' || inputValue === null) {
      //if user input is empty, keep going.
      return cb(null, inputValue);
    }
    // try to find specified processor
    if (this[processorName] && typeof this[processorName] === 'function') {
      this[processorName](params, cb);
    } else {
      cb(null, inputValue);
    }
  };
  /**
     * Convert the submission value back to input value.
     * @param  {[type]} submissionValue [description]
     * @param { function} cb callback
     * @return {[type]}                 [description]
     */
  Field.prototype.convertSubmission = function (submissionValue, cb) {
    var type = this.getType();
    var processorName = 'convert_' + type;
    // try to find specified processor
    if (this[processorName] && typeof this[processorName] === 'function') {
      this[processorName](submissionValue, cb);
    } else {
      cb(null, submissionValue);
    }
  };
  /**
     * validate an input with this field.
     * @param  {[type]} inputValue [description]
     * @return true / error message
     */
  Field.prototype.validate = function (inputValue, inputValueIndex, cb) {
    if(typeof(inputValueIndex) === 'function'){
      cb =inputValueIndex;
      inputValueIndex = 0;
    } 
    this.form.getRuleEngine().validateFieldValue(this.getFieldId(), inputValue,inputValueIndex, cb);
  };
  /**
     * return rule array attached to this field.
     * @return {[type]} [description]
     */
  Field.prototype.getRules = function () {
    var id = this.getFieldId();
    return this.form.getRulesByFieldId(id);
  };
  Field.prototype.setVisible = function (isVisible) {
    this.set('visible', isVisible);
    if (isVisible) {
      this.emit('visible');
    } else {
      this.emit('hidden');
    }
  };
  module.Field = Field;
  return module;
}(appForm.models || {});

/**
 * extension of Field class to support barcode field
 */
appForm.models.Field = function (module) {

  //Processing barcode values to the submission format
  //
  module.prototype.process_barcode = function (params, cb) {
    var inputValue = params.value || {};

    /**
     * Barcode value:
     *
     * {
     *   text: "<<Value of the scanned barcode>>",
     *   format: "<<Format of the scanned barcode>>"
     * }
     */
    if(typeof(inputValue.text) === "string" && typeof(inputValue.format) === "string"){
      return cb(null, {text: inputValue.text, format: inputValue.format});
    } else {
      return cb("Invalid barcode parameters.");
    }
  };
  return module;
}(appForm.models.Field || {});

/**
 * extension of Field class to support checkbox field
 */
appForm.models.Field = function (module) {
  module.prototype.getCheckBoxOptions = function () {
    var def = this.getFieldDefinition();
    if (def.options) {
      return def.options;
    } else {
      throw 'checkbox choice definition is not found in field definition';
    }
  };
  module.prototype.process_checkboxes = function (params, cb) {
    var inputValue = params.value;
    if (!inputValue || !inputValue.selections || !(inputValue.selections instanceof Array)){
      cb('the input value for processing checkbox field should be like {selections: [val1,val2]}');
    } else {
      cb(null, inputValue);
    }
  };
  module.prototype.convert_checkboxes = function (value, cb) {
    var rtn = [];
    for (var i = 0; i < value.length; i++) {
      rtn.push(value[i].selections);
    }
    cb(null, rtn);
  };
  return module;
}(appForm.models.Field || {});

/**
 * extension of Field class to support file field
 */
appForm.models.Field = function (module) {
  function checkFileObj(obj) {
    return obj.fileName && obj.fileType && obj.hashName;
  }
  module.prototype.process_file = function (params, cb) {
    var inputValue = params.value;
    var isStore = params.isStore === undefined ? true : params.isStore;
    var lastModDate = new Date().getTime();
    var previousFile = params.previousFile || {};
    var hashName = null;
    if (typeof inputValue === 'undefined' || inputValue === null) {
      return cb("No input value to process_file", null);
    }

    function getFileType(fileType, fileNameString){
      fileType = fileType || "";
      fileNameString = fileNameString || "";

      //The type if file is already known. No need to parse it out.
      if(fileType.length > 0){
        return fileType;
      }

      //Camera does not sent file type. Have to parse it from the file name.
      if(fileNameString.indexOf(".png") > -1){
        return "image/png";
      } else if(fileNameString.indexOf(".jpg") > -1){
        return "image/jpeg";
      } else {
        return "application/octet-stream";
      }
    }

    function getFileName(fileNameString, filePathString){
      fileNameString = fileNameString || "";
      if(fileNameString.length > 0){
        return fileNameString;
      } else {
        //Need to extract the name from the file path
        var indexOfName = filePathString.lastIndexOf("/");
        if(indexOfName > -1){
          return filePathString.slice(indexOfName);
        } else {
          return null;
        }
      }
    }

    var file = inputValue;
    if (inputValue instanceof HTMLInputElement) {
      file = inputValue.files[0] || {};  // 1st file only, not support many files yet.
    }

    if(typeof(file.lastModifiedDate) === 'undefined'){
      lastModDate = appForm.utils.getTime().getTime();
    }

    if(file.lastModifiedDate instanceof Date){
      lastModDate = file.lastModifiedDate.getTime();
    }

    var fileName = getFileName(file.name || file.fileName, file.fullPath);

    var fileType = getFileType(file.type || file.fileType, fileName);

    //Placeholder files do not have a file type. It inherits from previous types
    if(fileName === null && !previousFile.fileName){
      return cb("Expected picture to be PNG or JPEG but was null");
    }

    if(previousFile.hashName){
      if(fileName === previousFile.hashName || file.hashName === previousFile.hashName){
        //Submitting an existing file already saved, no need to save.
        return cb(null, previousFile);
      }
      //If the value has no extension and there is a previous, then it is the same file -- just the hashed version.
      if(fileType === "application/octet-stream"){
        return cb(null, previousFile);
      }
    }

    //The file to be submitted is new
    previousFile =  {
      'fileName': fileName,
      'fileSize': file.size,
      'fileType': fileType,
      'fileUpdateTime': lastModDate,
      'hashName': '',
      'imgHeader': '',
      'contentType': 'binary'
    };

    var name = fileName + new Date().getTime() + Math.ceil(Math.random() * 100000);
    appForm.utils.md5(name, function (err, res) {
      hashName = res;
      if (err) {
        hashName = name;
      }

      hashName = 'filePlaceHolder' + hashName;

      if(fileName.length === 0){
        previousFile.fileName = hashName;
      }

      previousFile.hashName = hashName;
      if (isStore) {
        appForm.stores.localStorage.saveFile(hashName, file, function (err, res) {
          if (err) {
            $fh.forms.log.e(err);
            cb(err);
          } else {
            cb(null, previousFile);
          }
        });
      } else {
        cb(null, previousFile);
      }
    });
  };
  return module;
}(appForm.models.Field || {});

/**
 * extension of Field class to support latitude longitude field
 */
appForm.models.Field = function (module) {
  /**
     * Format: [{lat: number, long: number}]
     * @param  {[type]} inputValues [description]
     * @return {[type]}             [description]
     */
  module.prototype.process_location = function (params, cb) {
    var inputValue = params.value;
    var def = this.getFieldDefinition();
    var obj={};
    switch (def.locationUnit) {
    case 'latlong':
      if (!inputValue.lat || !inputValue["long"]) {
        cb('the input values for latlong field is {lat: number, long: number}');
      } else {
        obj = {
            'lat': inputValue.lat,
            'long': inputValue["long"]
          };
        cb(null, obj);
      }
      break;
    case 'eastnorth':
      if (!inputValue.zone || !inputValue.eastings || !inputValue.northings) {
        cb('the input values for northeast field is {zone: text, eastings: text, northings:text}');
      } else {
        obj = {
            'zone': inputValue.zone,
            'eastings': inputValue.eastings,
            'northings': inputValue.northings
          };
        cb(null, obj);
      }
      break;
    default:
      cb('Invalid subtype type of location field, allowed types: latlong and eastnorth, was: ' + def.locationUnit);
      break;
    }
  };
  return module;
}(appForm.models.Field || {});
/**
 * extension of Field class to support matrix field
 */
appForm.models.Field = function (module) {
  module.prototype.getMatrixRows = function () {
    var def = this.getFieldDefinition();
    if (def.rows) {
      return def.rows;
    } else {
      throw 'matrix rows definition is not found in field definition';
    }
  };
  module.prototype.getMatrixCols = function () {
    var def = this.getFieldDefinition();
    if (def.columns) {
      return def.columns;
    } else {
      throw 'matrix columns definition is not found in field definition';
    }
  };
  return module;
}(appForm.models.Field || {});


/**
 * extension of Field class to support radio field
 */
appForm.models.Field = function (module) {
  module.prototype.getRadioOption = function () {
    var def = this.getFieldDefinition();
    if (def.options) {
      return def.options;
    } else {
      throw 'Radio options definition is not found in field definition';
    }
  };
  return module;
}(appForm.models.Field || {});
/**
 * extension of Field class to support the dropdown field
 */
appForm.models.Field = function (module) {
  module.prototype.getDropdownOptions = function () {
    var fieldDefinition = this.getFieldDefinition();
    var dropdownOptions = [];

    //If the include_blank_option is set, then add an empty option to the beginning of the options list.
    if(fieldDefinition.include_blank_option){
      dropdownOptions.push({
        label: ""
      });
    }

    var fieldDefOptions = fieldDefinition.options || [];

    for(var optionIndex = 0; optionIndex < fieldDefOptions.length; optionIndex++){
      dropdownOptions.push(fieldDefOptions[optionIndex]);
    }

    return dropdownOptions;
  };
  return module;
}(appForm.models.Field || {});
/**
 * extension of Field class to support file field
 */
appForm.models.Field = function (module) {
  function checkFileObj(obj) {
    return obj.fileName && obj.fileType && obj.hashName;
  }

  function imageProcess(params, cb) {
    var self = this;
    var inputValue = params.value;
    var isStore = params.isStore === undefined ? true : params.isStore;
    var previousFile = params.previousFile || {};
    if (typeof(inputValue) !== "string") {
      return cb("Expected base64 string image or file URI but parameter was not a string", null);
    }

    //Input value can be either a base64 String or file uri, the behaviour of upload will change accordingly.

    if(inputValue.length < 1){
      return cb("Expected base64 string or file uri but got string of lenght 0:  " + inputValue, null);
    }

    if(inputValue.indexOf(";base64,") > -1){
      var imgName = '';
      var dataArr = inputValue.split(';base64,');
      var imgType = dataArr[0].split(':')[1];
      var extension = imgType.split('/')[1];
      var size = inputValue.length;
      genImageName(function (err, n) {
        imgName = previousFile.hashName ? previousFile.hashName : 'filePlaceHolder' + n;
        //TODO Abstract this out
        var meta = {
          'fileName': imgName + '.' + extension,
          'hashName': imgName,
          'contentType': 'base64',
          'fileSize': size,
          'fileType': imgType,
          'imgHeader': 'data:' + imgType + ';base64,',
          'fileUpdateTime': new Date().getTime()
        };
        if (isStore) {
          appForm.stores.localStorage.updateTextFile(imgName, dataArr[1], function (err, res) {
            if (err) {
              $fh.forms.log.e(err);
              cb(err);
            } else {
              cb(null, meta);
            }
          });
        } else {
          cb(null, meta);
        }
      });
    } else {
      //Image is a file uri, the file needs to be saved as a file.
      //Can use the process_file function to do this.
      //Need to read the file as a file first
      appForm.utils.fileSystem.readAsFile(inputValue, function(err, file){
        if(err){
          return cb(err);
        }

        params.value = file;
        self.process_file(params, cb);
      });
    }
  }
  function genImageName(cb) {
    var name = new Date().getTime() + '' + Math.ceil(Math.random() * 100000);
    appForm.utils.md5(name, cb);
  }
  function convertImage(value, cb) {
    if (value.length === 0) {
      cb(null, value);
    } else {
      var count = value.length;
      for (var i = 0; i < value.length; i++) {
        var meta = value[i];
        _loadImage(meta, function (err, data) {
          count--;
          if (count === 0) {
            cb(null, [data]);
          }
        });
      }
    }
  }

  //An image can be either a base64 image or a binary image.
  //If base64, need to load the data as text.
  //If binary, just need to load the file uri.
  function _loadImage(meta, cb) {
    if (meta) {

      /**
       * If the file already contains a local uri, then no need to load it.
       */
      if(meta.localURI){
        return cb(null, meta);
      }

      var name = meta.hashName;
      if(meta.contentType === "base64"){
        appForm.stores.localStorage.readFileText(name, function (err, text) {
          if (err) {
            $fh.forms.log.e(err);
          }
          meta.data = text;
          cb(err, meta);
        });
      } else if(meta.contentType === "binary"){
        appForm.stores.localStorage.readFile(name, function(err, file){
          if(err){
            $fh.forms.log.e("Error reading file " + name, err);
          }

          if(file && file.localURL){
            meta.data = file.localURL;
          } else {
            meta.data = "file-not-found";
          }

          cb(err, meta);
        });
      } else {
        $fh.forms.log.e("Error load image with invalid meta" + meta.contentType);
      }
    } else {
      cb(null, meta);
    }
  }
  module.prototype.process_signature = imageProcess;
  module.prototype.convert_signature = convertImage;
  module.prototype.process_photo = imageProcess;
  module.prototype.convert_photo = convertImage;
  return module;
}(appForm.models.Field || {});


/**
 * One form contains multiple pages
 */
appForm.models = function (module) {

  var Model = appForm.models.Model;
  function Page(opt, parentForm) {
    if (typeof opt === 'undefined' || typeof parentForm === 'undefined') {
      throw 'Page initialise failed: new Page(pageDefinitionJSON, parentFormModel)';
    }
    Model.call(this, { '_type': 'page' });
    this.fromJSON(opt);
    this.form = parentForm;
    this.initialise();
  }
  appForm.utils.extend(Page, Model);
  Page.prototype.initialise = function () {
    var fieldsDef = this.getFieldDef();
    this.fieldsIds = [];
    for (var i = 0; i < fieldsDef.length; i++) {
      this.fieldsIds.push(fieldsDef[i]._id);
    }
  };
  Page.prototype.setVisible = function (isVisible) {
    this.set('visible', isVisible);
    if (isVisible) {
      this.emit('visible');
    } else {
      this.emit('hidden');
    }
  };
  Page.prototype.getFieldDef=function(){
    return this.get("fields",[]);
  };
  Page.prototype.getFieldDef=function(){
      return this.get("fields",[]);
  };
  Page.prototype.getFieldModelList=function(){
      var list=[];
      for (var i=0;i<this.fieldsIds.length;i++){
          list.push(this.form.getFieldModelById(this.fieldsIds[i]));
      }
      return list;
  };
  Page.prototype.checkForSectionBreaks=function(){ //Checking for any sections
    for (var i=0;i<this.fieldsIds.length;i++){
      var fieldModel = this.form.getFieldModelById(this.fieldsIds[i]);
      if(fieldModel && fieldModel.getType() === "sectionBreak"){
        return true;
      }
    }
    return false;
  };


  /**
   * Getting a list of sections for this page if the page contains any section breaks.
   *
   *
   * @returns {*}
   */
  Page.prototype.getSections=function(){ //Checking for any sections
    var sectionList={};
    var currentSectionId = null;
    var sectionBreaksExist = this.checkForSectionBreaks();
    var insertSectionBreak = false;

    var pageId = this.get("_id");

    //If there is a single section break in the page, then we need to render section breaks.
    if(sectionBreaksExist){
      //If there are section breaks, the first field in the form must be a section break. If not, add a placeholder
      var firstField = this.form.getFieldModelById(this.fieldsIds[0]);

      if(firstField.getType() !== "sectionBreak"){
        insertSectionBreak = true;
      }
    } else {
      //No section breaks exist in the page, so no need to render any section breaks.
      //We can just render the fields.
      return null;
    }

    //Iterating through the fields in the page and building a list of section breaks as required.
    for (var fieldModelIndex = 0; fieldModelIndex < this.fieldsIds.length; fieldModelIndex++){
      var fieldModel = this.form.getFieldModelById(this.fieldsIds[fieldModelIndex]);

      if(insertSectionBreak && fieldModelIndex === 0){ //Adding a first section.
        currentSectionId = "sectionBreak" + pageId + "0";
        sectionList[currentSectionId] = sectionList[currentSectionId] ? sectionList[currentSectionId] : {fields: []};
        sectionList[currentSectionId].title = "Section " + (fieldModelIndex+1);
      }

      if(currentSectionId !== null && fieldModel.getType() !== "sectionBreak"){
        sectionList[currentSectionId].fields.push(fieldModel);
      }

      if(fieldModel.getType() === "sectionBreak"){
        currentSectionId = fieldModel.get('_id');
        sectionList[currentSectionId] = sectionList[currentSectionId] ? sectionList[currentSectionId] : {fields: []};
        sectionList[currentSectionId].title = fieldModel.get('name', "Section " + (fieldModelIndex+1));
        sectionList[currentSectionId].description = fieldModel.get('helpText', "Section " + (fieldModelIndex+1));
      }
    }

    return sectionList;
  };
  Page.prototype.getFieldModelById=function(fieldId){
    return this.form.getFieldModelById(fieldId);
  };
  Page.prototype.getPageId=function(){
    return this.get("_id","");
  };
  Page.prototype.getName = function () {
    return this.get('name', '');
  };
  Page.prototype.getDescription = function () {
    return this.get('description', '');
  };
  Page.prototype.getFieldDef = function () {
    return this.get('fields', []);
  };
  Page.prototype.getFieldModelList = function () {
    var list = [];
    for (var i = 0; i < this.fieldsIds.length; i++) {
      list.push(this.form.getFieldModelById(this.fieldsIds[i]));
    }

    return list;
  };

    module.Page=Page;

    return module;
}(appForm.models || {});


/**
 * Manages submission uploading tasks
 */
appForm.models = function (module) {
  var Model = appForm.models.Model;
  function UploadManager() {
    var self = this;
    Model.call(self, {
      '_type': 'uploadManager',
      '_ludid': 'uploadManager_queue'
    });

    self.set('taskQueue', []);
    self.sending = false;
    self.timerInterval = 200;
    self.sendingStart = appForm.utils.getTime();
  }
  appForm.utils.extend(UploadManager, Model);

  /**
     * Queue a submission to uploading tasks queue
     * @param  {[type]} submissionModel [description]
     * @param {Function} cb callback once finished
     * @return {[type]}                 [description]
     */
  UploadManager.prototype.queueSubmission = function (submissionModel, cb) {
    $fh.forms.log.d("Queueing Submission for uploadManager");
    var utId;
    var uploadTask = null;
    var self = this;

    self.checkOnlineStatus(function(){
      if($fh.forms.config.isOnline()){
        if (submissionModel.getUploadTaskId()) {
          utId = submissionModel.getUploadTaskId();
        } else {
          uploadTask = appForm.models.uploadTask.newInstance(submissionModel);
          utId = uploadTask.getLocalId();
        }
        self.push(utId);
        if (!self.timer) {
          $fh.forms.log.d("Starting timer for uploadManager");
          self.start();
        }
        if (uploadTask) {
          uploadTask.saveLocal(function (err) {
            if (err) {
              $fh.forms.log.e(err);
            }
            self.saveLocal(function (err) {
              if (err) {
                $fh.forms.log.e("Error saving upload manager: " + err);
              }
              cb(null, uploadTask);
            });
          });
        } else {
          self.saveLocal(function (err) {
            if (err) {
              $fh.forms.log.e("Error saving upload manager: " + err);
            }
            self.getTaskById(utId, cb);
          });
        }
      } else {
        return cb("Working offline cannot submit form.");
      }
    });
  };

  /**
     * cancel a submission uploading
     * @param  {[type]}   submissionsModel [description]
     * @param  {Function} cb               [description]
     * @return {[type]}                    [description]
     */
  UploadManager.prototype.cancelSubmission = function (submissionsModel, cb) {
    var uploadTId = submissionsModel.getUploadTaskId();
    var queue = this.get('taskQueue');
    if (uploadTId) {
      var index = queue.indexOf(uploadTId);
      if (index > -1) {
        queue.splice(index, 1);
      }
      this.getTaskById(uploadTId, function (err, task) {
        if (err) {
          $fh.forms.log.e(err);
          cb(err, task);
        } else {
          if (task) {
            task.clearLocal(cb);
          } else {
            cb(null, null);
          }
        }
      });
      this.saveLocal(function (err) {
        if (err){
          $fh.forms.log.e(err);
        }
      });
    } else {
      cb(null, null);
    }
  };

  UploadManager.prototype.getTaskQueue = function () {
    return this.get('taskQueue', []);
  };
  /**
     * start a timer
     * @param  {} interval ms
     * @return {[type]}      [description]
     */
  UploadManager.prototype.start = function () {
    var that = this;
    that.stop();
    that.timer = setInterval(function () {
      that.tick();
    }, this.timerInterval);
  };
  /**
     * stop uploading
     * @return {[type]} [description]
     */
  UploadManager.prototype.stop = function () {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  };
  UploadManager.prototype.push = function (uploadTaskId) {
    this.get('taskQueue').push(uploadTaskId);
    this.saveLocal(function (err) {
      if (err){
        $fh.forms.log.e("Error saving local Upload manager", err);
      }
    });
  };
  UploadManager.prototype.shift = function () {
    var shiftedTask = this.get('taskQueue').shift();
    this.saveLocal(function (err) {
      if (err) {
        $fh.forms.log.e(err);
      }
    });
    return shiftedTask;
  };
  UploadManager.prototype.rollTask = function () {
    this.push(this.shift());
  };
  UploadManager.prototype.tick = function () {
    var self = this;
    if (self.sending) {
      var now = appForm.utils.getTime();
      var timePassed = now.getTime() - self.sendingStart.getTime();
      if (timePassed > $fh.forms.config.get("timeout") * 1000) {
        //time expired. roll current task to the end of queue
        $fh.forms.log.e('Uploading content timeout. it will try to reupload.');
        self.sending = false;
        self.rollTask();
      }
    } else {
      if (self.hasTask()) {
        self.sending = true;
        self.sendingStart = appForm.utils.getTime();

        self.getCurrentTask(function (err, task) {
          if (err || !task) {
            $fh.forms.log.e(err);
            self.sending = false;
          } else {
            if (task.isCompleted() || task.isError()) {
              //current task uploaded or aborted by error. shift it from queue
              self.shift();
              self.sending = false;
              self.saveLocal(function (err) {
                if(err){
                  $fh.forms.log.e("Error saving upload manager: ", err);
                }
              });
            } else {
              self.checkOnlineStatus(function(){
                if($fh.forms.config.isOnline()){
                  task.uploadTick(function (err) {
                    if(err){
                      $fh.forms.log.e("Error on upload tick: ", err, task);
                    }

                    //callback when finished. ready for next upload command
                    self.sending = false;
                  });
                } else {
                  $fh.forms.log.d("Upload Manager: Tick: Not online.");
                }
              });
            }
          }
        });
      } else {
        //no task . stop timer.
        self.stop();
      }
    }
  };
  UploadManager.prototype.hasTask = function () {
    return this.get('taskQueue').length > 0;
  };
  UploadManager.prototype.getCurrentTask = function (cb) {
    var taskId = this.getTaskQueue()[0];
    if (taskId) {
      this.getTaskById(taskId, cb);
    } else {
      cb(null, null);
    }
  };
  UploadManager.prototype.checkOnlineStatus = function (cb) {
    appForm.stores.dataAgent.checkOnlineStatus(cb);
  };
  UploadManager.prototype.getTaskById = function (taskId, cb) {
    appForm.models.uploadTask.fromLocal(taskId, cb);
  };
  module.uploadManager = new UploadManager();
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  /**
     * Describe rules associated to one field.
     * @param {[type]} param {"type":"page | field", "definition":defJson}
     */
  function Rule(param) {
    Model.call(this, { '_type': 'rule' });
    this.fromJSON(param);
  }
  appForm.utils.extend(Rule, Model);
  /**
     * Return source fields id required from input value for this rule
     * @return [fieldid1, fieldid2...] [description]
     */
  Rule.prototype.getRelatedFieldId = function () {
    var def = this.getDefinition();
    var statements = def.ruleConditionalStatements;
    var rtn = [];
    for (var i = 0; i<statements.length; i++) {
      var statement = statements[i];
      rtn.push(statement.sourceField);
    }
    return rtn;
  };
  /**
     * test if input value meet the condition
     * @param  {[type]} param {fieldId:value, fieldId2:value2}
     * @return {[type]}       true - meet rule  / false -  not meet rule
     */
  Rule.prototype.test = function (param) {
    var fields = this.getRelatedFieldId();
    var logic = this.getLogic();
    var res = logic === 'or' ? false : true;
    for (var i = 0; i< fields.length ; i++) {
      var fieldId = fields[i];
      var val = param[fieldId];
      if (val) {
        var tmpRes = this.testField(fieldId, val);
        if (logic === 'or') {
          res = res || tmpRes;
          if (res === true) {
            //break directly
            return true;
          }
        } else {
          res = res && tmpRes;
          if (res === false) {
            //break directly
            return false;
          }
        }
      } else {
        if (logic === 'or') {
          res = res || false;
        } else {
          return false;
        }
      }
    }
    return res;
  };
  /**
     * test a field if the value meets its conditon
     * @param  {[type]} fieldId [description]
     * @param  {[type]} val     [description]
     * @return {[type]}         [description]
     */
  Rule.prototype.testField = function (fieldId, val) {
    var statement = this.getRuleConditionStatement(fieldId);
    var condition = statement.restriction;
    var expectVal = statement.sourceValue;
    return appForm.models.checkRule(condition, expectVal, val);
  };
  Rule.prototype.getRuleConditionStatement = function (fieldId) {
    var statements = this.getDefinition().ruleConditionalStatements;
    for (var i = 0; i<statements.length; i++) {
      var statement = statements[i];
      if (statement.sourceField === fieldId) {
        return statement;
      }
    }
    return null;
  };
  Rule.prototype.getLogic = function () {
    var def = this.getDefinition();
    return def.ruleConditionalOperator.toLowerCase();
  };
  Rule.prototype.getDefinition = function () {
    return this.get('definition');
  };
  Rule.prototype.getAction = function () {
    var def = this.getDefinition();
    var target = {
        'action': def.type,
        'targetId': this.get('type') === 'page' ? def.targetPage : def.targetField,
        'targetType': this.get('type')
      };
    return target;
  };
  module.Rule = Rule;
  return module;
}(appForm.models || {});
/**
 * Uploading task for each submission
 */
appForm.models = function (module) {
  module.uploadTask = {
    'newInstance': newInstance,
    'fromLocal': fromLocal
  };


  var _uploadTasks = {};

  var Model = appForm.models.Model;

  function newInstance(submissionModel) {
    if(submissionModel){
      var utObj = new UploadTask();
      utObj.init(submissionModel);
      _uploadTasks[utObj.getLocalId()] = utObj;
      return utObj;
    } else {
      return {};
    }
  }


  function fromLocal(localId, cb) {
    if (_uploadTasks[localId]) {
      return cb(null, _uploadTasks[localId]);
    }
    var utObj = new UploadTask();
    utObj.setLocalId(localId);
    _uploadTasks[localId] = utObj;
    utObj.loadLocal(cb);
  }


  function UploadTask() {
    Model.call(this, { '_type': 'uploadTask' });
  }


  appForm.utils.extend(UploadTask, Model);
  UploadTask.prototype.init = function (submissionModel) {
    var self = this;
    var submissionLocalId = submissionModel.getLocalId();
    self.setLocalId(submissionLocalId + '_' + 'uploadTask');
    self.set('submissionLocalId', submissionLocalId);
    self.set('fileTasks', []);
    self.set('currentTask', null);
    self.set('completed', false);
    self.set('retryAttempts', 0);
    self.set('retryNeeded', false);
    self.set('mbaasCompleted', false);
    self.set('submissionTransferType', 'upload');
    submissionModel.setUploadTaskId(self.getLocalId());

    function initSubmissionUpload(){
      var json = submissionModel.getProps();
      self.set('jsonTask', json);
      self.set('formId', submissionModel.get('formId'));

    }

    function initSubmissionDownload(){
      self.set('submissionId', submissionModel.getRemoteSubmissionId());
      self.set('jsonTask', {});
      self.set('submissionTransferType', 'download');
    }

    if(submissionModel.isDownloadSubmission()){
      initSubmissionDownload();
    } else {
      initSubmissionUpload();
    }
  };
  UploadTask.prototype.getTotalSize = function () {
    var self = this;
    var jsonSize = JSON.stringify(self.get('jsonTask')).length;
    var fileTasks = self.get('fileTasks');
    var fileSize = 0;
    var fileTask;
    for (var i = 0; i<fileTasks.length ; i++) {
      fileTask = fileTasks[i];
      fileSize += fileTask.fileSize;
    }
    return jsonSize + fileSize;
  };
  UploadTask.prototype.getUploadedSize = function () {
    var currentTask = this.getCurrentTask();
    if (currentTask === null) {
      return 0;
    } else {
      var jsonSize = JSON.stringify(this.get('jsonTask')).length;
      var fileTasks = this.get('fileTasks');
      var fileSize = 0;
      for (var i = 0, fileTask; (fileTask = fileTasks[i]) && i < currentTask; i++) {
        fileSize += fileTask.fileSize;
      }
      return jsonSize + fileSize;
    }
  };
  UploadTask.prototype.getRemoteStore = function () {
    return appForm.stores.dataAgent.remoteStore;
  };
  UploadTask.prototype.addFileTasks = function(submissionModel, cb){
    var self = this;
    submissionModel.getFileInputValues(function(err, files){
      if(err){
        $fh.forms.log.e("Error getting file Input values: " + err);
        return cb(err);
      }
      for (var i = 0; i<files.length ; i++) {
        var file = files[i];
        self.addFileTask(file);
      }
      cb();
    });
  };
  UploadTask.prototype.addFileTask = function (fileDef) {
    this.get('fileTasks').push(fileDef);
  };
  /**
   * get current uploading task
   * @return {[type]} [description]
   */
  UploadTask.prototype.getCurrentTask = function () {
    return this.get('currentTask', null);
  };
  UploadTask.prototype.getRetryAttempts = function () {
    return this.get('retryAttempts');
  };
  UploadTask.prototype.increRetryAttempts = function () {
    this.set('retryAttempts', this.get('retryAttempts') + 1);
  };
  UploadTask.prototype.resetRetryAttempts = function () {
    this.set('retryAttempts', 0);
  };
  UploadTask.prototype.isStarted = function () {
    return this.getCurrentTask() === null ? false : true;
  };


  UploadTask.prototype.setSubmissionQueued = function(cb){
    var self = this;
    self.submissionModel(function(err, submission){
      if(err){
        return cb(err);
      }

      if(self.get("submissionId")){
        submission.setRemoteSubmissionId(self.get("submissionId"));
      }

      submission.queued(cb);
    });
  };
  /**
   * upload/download form submission
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  UploadTask.prototype.uploadForm = function (cb) {
    var self = this;

    function processUploadDataResult(res){
      $fh.forms.log.d("In processUploadDataResult");
      var formSub = self.get("jsonTask");
      if(res.error){
        $fh.forms.log.e("Error submitting form " + res.error);
        return cb("Error submitting form " + res.error);
      } else {
        var submissionId = res.submissionId;
        // form data submitted successfully.
        formSub.lastUpdate = appForm.utils.getTime();
        self.set('submissionId', submissionId);

        self.setSubmissionQueued(function(err){
          self.increProgress();
          self.saveLocal(function (err) {
            if (err) {
              $fh.forms.log.e("Error saving uploadTask to local storage" + err);
            }
          });
          self.emit('progress', self.getProgress());
          return cb(null);
        });
      }
    }

    function processDownloadDataResult(err, res){
      $fh.forms.log.d("In processDownloadDataResult");
      if(err){
        $fh.forms.log.e("Error downloading submission data"+ err);
        return cb(err);
      }

      //Have the definition of the submission
      self.submissionModel(function(err, submissionModel){
        $fh.forms.log.d("Got SubmissionModel", err, submissionModel);
        if(err){
          return cb(err);
        }
        var JSONRes = {};

        //Instantiate the model from the json definition
        if(typeof(res) === "string"){
          try{
            JSONRes = JSON.parse(res);
          } catch (e){
            $fh.forms.log.e("processDownloadDataResult Invalid JSON Object Returned", res);
            return cb("Invalid JSON Object Returned");
          }
        } else {
          JSONRes = res;
        }

        if(JSONRes.status){
          delete JSONRes.status;
        }

        submissionModel.fromJSON(JSONRes);
        self.set('jsonTask', res);
        submissionModel.saveLocal(function(err){
          $fh.forms.log.d("Saved SubmissionModel", err, submissionModel);
          if(err){
            $fh.forms.log.e("Error saving updated submission from download submission: " + err);
          }

          //Submission Model is now populated with all the fields in the submission
          self.addFileTasks(submissionModel, function(err){
            $fh.forms.log.d("addFileTasks called", err, submissionModel);
            if(err){
              return cb(err);
            }
            self.increProgress();
            self.saveLocal(function (err) {
              if (err) {
                $fh.forms.log.e("Error saving downloadTask to local storage" + err);
              }

              self.emit('progress', self.getProgress());
              return cb();
            });
          });
        });
      });
    }

    function uploadSubmissionJSON(){
      $fh.forms.log.d("In uploadSubmissionJSON");
      var formSub = self.get('jsonTask');
      self.submissionModel(function(err, submissionModel){
        if(err){
          return cb(err);
        }
        self.addFileTasks(submissionModel, function(err){
          if(err){
            $fh.forms.log.e("Error adding file tasks for submission upload");
            return cb(err);
          }

          var formSubmissionModel = new appForm.models.FormSubmission(formSub);
          self.getRemoteStore().create(formSubmissionModel, function (err, res) {
            if (err) {
              return cb(err);
            } else {
              var updatedFormDefinition = res.updatedFormDefinition;
              if (updatedFormDefinition) {
                // remote form definition is updated
                self.refreshForm(updatedFormDefinition, function (err) {
                  //refresh form def in parallel. maybe not needed.
                  $fh.forms.log.d("Form Updated, refreshed");
                  if (err) {
                    $fh.forms.log.e(err);
                  }
                  processUploadDataResult(res);
                });
              } else {
                processUploadDataResult(res);
              }
            }
          });
        });
      });

    }

    function downloadSubmissionJSON(){
      var formSubmissionDownload = new appForm.models.FormSubmissionDownload(self);
      self.getRemoteStore().read(formSubmissionDownload, processDownloadDataResult);
    }

    if(self.isDownloadTask()){
      downloadSubmissionJSON();
    } else {
      uploadSubmissionJSON();
    }
  };

  /**
   * Handles the case where a call to completeSubmission returns a status other than "completed".
   * Will only ever get to this function when a call is made to the completeSubmission server.
   *
   *
   * @param err (String) Error message associated with the error returned
   * @param res {"status" : <pending/error>, "pendingFiles" : [<any pending files not yet uploaded>]}
   * @param cb Function callback
   */
  UploadTask.prototype.handleCompletionError = function (err, res, cb) {
    $fh.forms.log.d("handleCompletionError Called");
    var errorMessage = err;
    if (res.status === 'pending') {
      //The submission is not yet complete, there are files waiting to upload. This is an unexpected state as all of the files should have been uploaded.
      errorMessage = 'Submission Still Pending.';
    } else if (res.status === 'error') {
      //There was an error completing the submission.
      errorMessage = 'Error completing submission';
    } else {
      errorMessage = 'Invalid return type from complete submission';
    }
    cb(errorMessage);
  };

  /**
   * Handles the case where the current submission status is required from the server.
   * Based on the files waiting to be uploaded, the upload task is re-built with pendingFiles from the server.
   *
   * @param cb
   */
  UploadTask.prototype.handleIncompleteSubmission = function (cb) {
    var self = this;
    function processUploadIncompleteSubmission(){

      var remoteStore = self.getRemoteStore();
      var submissionStatus = new appForm.models.FormSubmissionStatus(self);

      remoteStore.submissionStatus(submissionStatus, function (err, res) {
        var errMessage="";
        if (err) {
          cb(err);
        } else if (res.status === 'error') {
          //The server had an error submitting the form, finish with an error
          errMessage= 'Error submitting form.';
          cb(errMessage);
        } else if (res.status === 'complete') {
          //Submission is complete, make uploading progress further
          self.increProgress();
          cb();
        } else if (res.status === 'pending') {
          //Submission is still pending, check for files not uploaded yet.
          var pendingFiles = res.pendingFiles || [];
          if (pendingFiles.length > 0) {
            self.resetUploadTask(pendingFiles, function () {
              cb();
            });
          } else {
            //No files pending on the server, make the progress further
            self.increProgress();
            cb();
          }
        } else {
          //Should not get to this point. Only valid status responses are error, pending and complete.
          errMessage = 'Invalid submission status response.';
          cb(errMessage);
        }
      });
    }

    function processDownloadIncompleteSubmission(){
      //No need to go the the server to get submission details -- The current progress status is valid locally
      cb();
    }

    if(self.isDownloadTask()){
      processDownloadIncompleteSubmission();
    } else {
      processUploadIncompleteSubmission();
    }
  };

  /**
   * Resetting the upload task based on the response from getSubmissionStatus
   * @param pendingFiles -- Array of files still waiting to upload
   * @param cb
   */
  UploadTask.prototype.resetUploadTask = function (pendingFiles, cb) {
    var filesToUpload = this.get('fileTasks');
    var resetFilesToUpload = [];
    var fileIndex;
    //Adding the already completed files to the reset array.
    for (fileIndex = 0; fileIndex < filesToUpload.length; fileIndex++) {
      if (pendingFiles.indexOf(filesToUpload[fileIndex].hashName) < 0) {
        resetFilesToUpload.push(filesToUpload[fileIndex]);
      }
    }
    //Adding the pending files to the end of the array.
    for (fileIndex = 0; fileIndex < filesToUpload.length; fileIndex++) {
      if (pendingFiles.indexOf(filesToUpload[fileIndex].hashName) > -1) {
        resetFilesToUpload.push(filesToUpload[fileIndex]);
      }
    }
    var resetFileIndex = filesToUpload.length - pendingFiles.length - 1;
    var resetCurrentTask = 0;
    if (resetFileIndex > 0) {
      resetCurrentTask = resetFileIndex;
    }
    //Reset current task
    this.set('currentTask', resetCurrentTask);
    this.set('fileTasks', resetFilesToUpload);
    this.saveLocal(cb);  //Saving the reset files list to local
  };
  UploadTask.prototype.uploadFile = function (cb) {
    var self = this;
    var progress = self.getCurrentTask();

    if (progress === null) {
      progress = 0;
      self.set('currentTask', progress);
    }
    var fileTask = self.get('fileTasks', [])[progress];
    var submissionId = self.get('submissionId');
    var fileSubmissionModel;
    if (!fileTask) {
      $fh.forms.log.e("No file task found when trying to transfer a file.");
      return cb('cannot find file task');
    }

    if(!submissionId){
      $fh.forms.log.e("No submission id found when trying to transfer a file.");
      return cb("No submission Id found");
    }

    function processUploadFile(){
      $fh.forms.log.d("processUploadFile for submissionId: ");
      if (fileTask.contentType === 'base64') {
        fileSubmissionModel = new appForm.models.Base64FileSubmission(fileTask);
      } else {
        fileSubmissionModel = new appForm.models.FileSubmission(fileTask);
      }
      fileSubmissionModel.setSubmissionId(submissionId);
      fileSubmissionModel.loadFile(function (err) {
        if (err) {
          $fh.forms.log.e("Error loading file for upload: " + err);
          return cb(err);
        } else {
          self.getRemoteStore().create(fileSubmissionModel, function (err, res) {
            if (err) {
              cb(err);
            } else {
              if (res.status === 'ok' || res.status === 200 || res.status === '200') {
                fileTask.updateDate = appForm.utils.getTime();
                self.increProgress();
                self.saveLocal(function (err) {
                  //save current status.
                  if (err) {
                    $fh.forms.log.e("Error saving upload task" + err);
                  }
                });
                self.emit('progress', self.getProgress());
                cb(null);
              } else {
                var errorMessage = 'File upload failed for file: ' + fileTask.fileName;
                cb(errorMessage);
              }
            }
          });
        }
      });
    }

    function processDownloadFile(){
      $fh.forms.log.d("processDownloadFile called");
      fileSubmissionModel = new appForm.models.FileSubmissionDownload(fileTask);
      fileSubmissionModel.setSubmissionId(submissionId);
      self.getRemoteStore().read(fileSubmissionModel, function (err, localFilePath) {
        if(err){
          $fh.forms.log.e("Error downloading a file from remote: " + err);
          return cb(err);
        }

        $fh.forms.log.d("processDownloadFile called. Local File Path: " + localFilePath);

        //Update the submission model to add local file uri to a file submission object
        self.submissionModel(function(err, submissionModel){
          if(err){
            $fh.forms.log.e("Error Loading submission model for processDownloadFile " + err);
            return cb(err);
          }

          submissionModel.updateFileLocalURI(fileTask, localFilePath, function(err){
            if(err){
              $fh.forms.log.e("Error updating file local url for fileTask " + JSON.stringify(fileTask));
              return cb(err);
            }

            self.increProgress();
            self.saveLocal(function (err) {
              //save current status.
              if (err) {
                $fh.forms.log.e("Error saving download task");
              }
            });
            self.emit('progress', self.getProgress());
            return cb();
          });
        });
      });
    }

    if(self.isDownloadTask()){
      processDownloadFile();
    } else {
      processUploadFile();
    }
  };
  UploadTask.prototype.isDownloadTask = function(){
    return this.get("submissionTransferType") === "download";
  };
  //The upload task needs to be retried
  UploadTask.prototype.setRetryNeeded = function (retryNeeded) {
    //If there is a submissionId, then a retry is needed. If not, then the current task should be set to null to retry the submission.
    if (this.get('submissionId', null) != null) {
      this.set('retryNeeded', retryNeeded);
    } else {
      this.set('retryNeeded', false);
      this.set('currentTask', null);
    }
  };
  UploadTask.prototype.retryNeeded = function () {
    return this.get('retryNeeded');
  };
  UploadTask.prototype.uploadTick = function (cb) {
    var self = this;
    function _handler(err) {
      if (err) {
        $fh.forms.log.d('Err, retrying transfer: ' + self.getLocalId());
        //If the upload has encountered an error -- flag the submission as needing a retry on the next tick -- User should be insulated from an error until the retries are finished.
        self.increRetryAttempts();
        if (self.getRetryAttempts() <= $fh.forms.config.get('max_retries')) {
          self.setRetryNeeded(true);
          self.saveLocal(function (err) {
            if (err){
              $fh.forms.log.e("Error saving upload taskL " + err);
            }

            cb();
          });
        } else {
          //The number of retry attempts exceeds the maximum number of retry attempts allowed, flag the upload as an error.
          self.setRetryNeeded(true);
          self.resetRetryAttempts();
          self.error(err, function () {
            cb(err);
          });
        }
      } else {
        //no error.
        self.setRetryNeeded(false);
        self.saveLocal(function (_err) {
          if (_err){
            $fh.forms.log.e("Error saving upload task to local memory" + _err);
          }
        });
        self.submissionModel(function (err, submission) {
          if (err) {
            cb(err);
          } else {
            var status = submission.get('status');
            if (status !== 'inprogress' && status !== 'submitted' && status !== 'downloaded' && status !== 'queued') {
              $fh.forms.log.e('Submission status is incorrect. Upload task should be started by submission object\'s upload method.' + status);
              cb('Submission status is incorrect. Upload task should be started by submission object\'s upload method.');
            } else {
              cb();
            }
          }
        });
      }
    }
    if (!this.isFormCompleted()) {
      // No current task, send the form json
      this.uploadForm(_handler);
    } else if (this.retryNeeded()) {
      //If a retry is needed, this tick gets the current status of the submission from the server and resets the submission.
      this.handleIncompleteSubmission(_handler);
    } else if (!this.isFileCompleted()) {
      //files to be uploaded
      this.uploadFile(_handler);
    } else if (!this.isMBaaSCompleted()) {
      //call mbaas to complete upload
      this.uploadComplete(_handler);
    } else if (!this.isCompleted()) {
      //complete the upload task
      this.success(_handler);
    } else {
      //task is already completed.
      _handler(null, null);
    }
  };
  UploadTask.prototype.increProgress = function () {
    var curTask = this.getCurrentTask();
    if (curTask === null) {
      curTask = 0;
    } else {
      curTask++;
    }
    this.set('currentTask', curTask);
  };
  UploadTask.prototype.uploadComplete = function (cb) {
    $fh.forms.log.d("UploadComplete Called");
    var self = this;
    var submissionId = self.get('submissionId', null);

    if (submissionId === null) {
      return cb('Failed to complete submission. Submission Id not found.');
    }

    function processDownloadComplete(){
      $fh.forms.log.d("processDownloadComplete Called");
      self.increProgress();
      cb(null);
    }

    function processUploadComplete(){
      $fh.forms.log.d("processUploadComplete Called");
      var remoteStore = self.getRemoteStore();
      var completeSubmission = new appForm.models.FormSubmissionComplete(self);
      remoteStore.create(completeSubmission, function (err, res) {
        //if status is not "completed", then handle the completion err
        res = res || {};
        if (res.status !== 'complete') {
          return self.handleCompletionError(err, res, cb);
        }
        //Completion is now completed sucessfully.. we can make the progress further.
        self.increProgress();
        cb(null);
      });
    }

    if(self.isDownloadTask()){
      processDownloadComplete();
    } else {
      processUploadComplete();
    }
  };
  /**
   * the upload task is successfully completed. This will be called when all uploading process finished successfully.
   * @return {[type]} [description]
   */
  UploadTask.prototype.success = function (cb) {
    $fh.forms.log.d("Transfer Sucessful. Success Called.");
    var self = this;
    var submissionId = self.get('submissionId', null);
    self.set('completed', true);
    

    function processUploadSuccess(cb){
      $fh.forms.log.d("processUploadSuccess Called");
      self.submissionModel(function (_err, model) {
        if(_err){
          return cb(_err);
        }
        model.setRemoteSubmissionId(submissionId);
        model.submitted(cb);
      });
    }

    function processDownloadSuccess(cb){
      $fh.forms.log.d("processDownloadSuccess Called");
      self.submissionModel(function (_err, model) {
        if(_err){
          return cb(_err);
        } else {
          model.populateFilesInSubmission();
          model.downloaded(cb);
        }
      });
    }

    self.saveLocal(function (err) {
      if (err) {
        $fh.forms.log.e("Error Clearing Upload Task");
      }

      if(self.isDownloadTask()){
        processDownloadSuccess(function(err){
          self.clearLocal(cb);
        });
      } else {
        processUploadSuccess(function(err){
          self.clearLocal(cb);
        });
      }
    });
  };
  /**
   * the upload task is failed. It will not complete the task but will set error with error returned.
   * @param  {[type]}   err [description]
   * @param  {Function} cb  [description]
   * @return {[type]}       [description]
   */
  UploadTask.prototype.error = function (uploadErrorMessage, cb) {
    var self = this;
    $fh.forms.log.e("Error uploading submission: ", uploadErrorMessage);
    self.set('error', uploadErrorMessage);
    self.saveLocal(function (err) {
      if (err) {
        $fh.forms.log.e('Upload task save failed: ' + err);
      }

      self.submissionModel(function (_err, model) {
        if (_err) {
          cb(_err);
        } else {
          model.setUploadTaskId(null);
          model.error(uploadErrorMessage, function (err) {
            if(err){
              $fh.forms.log.e("Error updating submission model to error status ", err);
            } 
            self.clearLocal(function(err){
              if(err){
                $fh.forms.log.e("Error clearing upload task local storage: ", err);
              }  
              cb(err);    
            });
          });
        }
      });
    });
  };
  UploadTask.prototype.isFormCompleted = function () {
    var curTask = this.getCurrentTask();
    if (curTask === null) {
      return false;
    } else {
      return true;
    }
  };
  UploadTask.prototype.isFileCompleted = function () {
    var curTask = this.getCurrentTask();
    if (curTask === null) {
      return false;
    } else if (curTask < this.get('fileTasks', []).length) {
      return false;
    } else {
      return true;
    }
  };
  UploadTask.prototype.isError = function () {
    var error = this.get('error', null);
    if (error) {
      return true;
    } else {
      return false;
    }
  };
  UploadTask.prototype.isCompleted = function () {
    return this.get('completed', false);
  };
  UploadTask.prototype.isMBaaSCompleted = function () {
    var self = this;
    if (!self.isFileCompleted()) {
      return false;
    } else {
      var curTask = self.getCurrentTask();
      if (curTask > self.get('fileTasks', []).length) {
        //change offset if completion bit is changed
        self.set("mbaasCompleted", true);
        self.saveLocal(function(err){
          if(err){
            $fh.forms.log.e("Error saving upload task: ", err);
          }
        });
        return true;
      } else {
        return false;
      }
    }
  };
  UploadTask.prototype.getProgress = function () {
    var self = this;
    var rtn = {
        'formJSON': false,
        'currentFileIndex': 0,
        'totalFiles': self.get('fileTasks').length,
        'totalSize': self.getTotalSize(),
        'uploaded': self.getUploadedSize(),
        'retryAttempts': self.getRetryAttempts(),
        'submissionTransferType': self.get('submissionTransferType'),
        'submissionRemoteId': self.get('submissionId'),
        'submissionLocalId': self.get('submissionLocalId')
      };
    var progress = self.getCurrentTask();
    if (progress === null) {
      return rtn;
    } else {
      //Boolean specifying if the submission JSON has been uploaded.
      rtn.formJSON = true;
      rtn.currentFileIndex = progress;
    }
    return rtn;
  };
  /**
   * Refresh related form definition.
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  UploadTask.prototype.refreshForm = function (updatedForm, cb) {
    var formId = this.get('formId');
    new appForm.models.Form({'formId': formId, 'rawMode': true, 'rawData' : updatedForm }, function (err, form) {
      if (err) {
        $fh.forms.log.e(err);
      }

      $fh.forms.log.l('successfully updated form the form with id ' + updatedForm._id);
      cb();
    });
  };
  UploadTask.prototype.submissionModel = function (cb) {
    appForm.models.submission.fromLocal(this.get('submissionLocalId'), function (err, submission) {
      if (err) {
        $fh.forms.log.e("Error getting submission model from local memory " + err);
      }
      cb(err, submission);
    });
  };
  return module;
}(appForm.models || {});
appForm.models = function (module) {
  var Model = appForm.models.Model;
  function Theme() {
    Model.call(this, {
      '_type': 'theme',
      '_ludid': 'theme_object'
    });
  }
  Theme.prototype.getCSS = function () {
    return this.get('css', '');
  };
  appForm.utils.extend(Theme, Model);
  module.theme = new Theme();
  return module;
}(appForm.models || {});
/**
 * Async log module
 * @param  {[type]} module [description]
 * @return {[type]}        [description]
 */
appForm.models = (function(module) {
  var Model = appForm.models.Model;

  function Log() {
    Model.call(this, {
      '_type': 'log',
      "_ludid": "log"
    });
    this.set("logs", []);
    this.isWriting = false;
    this.moreToWrite = false;
    //    appForm.
    //    this.loadLocal(function() {});
  }
  appForm.utils.extend(Log, Model);

  Log.prototype.info = function(logLevel, msgs) {
      if ($fh.forms.config.get("logger") === true) {
        var levelString = "";
        var curLevel = $fh.forms.config.get("log_level");
        var log_levels = $fh.forms.config.get("log_levels");
        var self = this;
        if (typeof logLevel === "string") {
          levelString = logLevel;
          logLevel = log_levels.indexOf(logLevel.toLowerCase());
        } else {
          logLevel = 0;
        }

        curLevel = isNaN(parseInt(curLevel, 10)) ? curLevel : parseInt(curLevel, 10);
        logLevel = isNaN(parseInt(logLevel, 10)) ? logLevel : parseInt(logLevel, 10);

        if (curLevel < logLevel) {
          return;
        } else {
          var args = Array.prototype.splice.call(arguments, 0);
          var logs = self.get("logs");
          args.shift();
          var logStr = "";
          while (args.length > 0) {
            logStr += JSON.stringify(args.shift()) + " ";
          }
          logs.push(self.wrap(logStr, levelString));
          if (logs.length > $fh.forms.config.get("log_line_limit")) {
            logs.shift();
          }
          if (self.isWriting) {
            self.moreToWrite = true;
          } else {
            var _recursiveHandler = function() {
              if (self.moreToWrite) {
                self.moreToWrite = false;
                self.write(_recursiveHandler);
              }
            };
            self.write(_recursiveHandler);
          }
        }
      }
    };
  Log.prototype.wrap = function(msg, levelString) {
    var now = new Date();
    var dateStr = now.toISOString();
    if (typeof msg === "object") {
      msg = JSON.stringify(msg);
    }
    var finalMsg = dateStr + " " + levelString.toUpperCase() + " " + msg;
    return finalMsg;
  };
  
  Log.prototype.write = function(cb) {
    var self = this;
    self.isWriting = true;
    self.saveLocal(function() {
      self.isWriting = false;
      cb();
    });
  };
  Log.prototype.e = function() {
    var args = Array.prototype.splice.call(arguments, 0);
    args.unshift("error");
    this.info.apply(this, args);
  };
  Log.prototype.w = function() {
    var args = Array.prototype.splice.call(arguments, 0);
    args.unshift("warning");
    this.info.apply(this, args);
  };
  Log.prototype.l = function() {
    var args = Array.prototype.splice.call(arguments, 0);
    args.unshift("log");
    this.info.apply(this, args);
  };
  Log.prototype.d = function() {
    var args = Array.prototype.splice.call(arguments, 0);
    args.unshift("debug");
    this.info.apply(this, args);
  };
  Log.prototype.getLogs = function() {
    return this.get("logs");
  };
  Log.prototype.clearLogs = function(cb) {
    this.set("logs", []);
    this.saveLocal(function() {
      if (cb) {
        cb();
      }
    });
  };
  Log.prototype.sendLogs = function(cb) {
    var email = $fh.forms.config.get("log_email");
    var config = appForm.config.getProps();
    var logs = this.getLogs();
    var params = {
      "type": "email",
      "to": email,
      "subject": "App Forms App Logs",
      "body": "Configuration:\n" + JSON.stringify(config) + "\n\nApp Logs:\n" + logs.join("\n")
    };
    appForm.utils.send(params, cb);
  };
  module.log = new Log();
  appForm.log = module.log;
  return module;
})(appForm.models || {});
/**
 * FeedHenry License
 */
appForm.api = function (module) {
  module.getForms = getForms;
  module.getForm = getForm;
  module.getTheme = getTheme;
  module.submitForm = submitForm;
  module.getSubmissions = getSubmissions;
  module.downloadSubmission = downloadSubmission;
  module.init = appForm.init;
  module.log=appForm.models.log;
  module._events = {};

  //Registering For Global Events
  module.on = function(name, func, callOnce){
    if (!module._events[name]) {
      module._events[name] = [];
    }
    if (module._events[name].indexOf(func) < 0) {
      module._events[name].push({
        callOnce: callOnce,
        func: func
      });
    }
  };

  module.once = function(name, func){
    module.on(name, func, true);
  };

  //Emitting A Global Event
  module.emit = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var eventName = args.shift();
    var funcDetailsArray = module._events[eventName];
    if (funcDetailsArray && funcDetailsArray.length > 0) {
      for (var i = 0; i < funcDetailsArray.length; i++) {
        var functionDetails = funcDetailsArray[i];
        var functionToCall = funcDetailsArray[i].func;
        //If the function was not already called, or is not only set to call once, the call the function,
        //Otherwise, don't call it.
        if(!functionDetails.called || !functionDetails.callOnce){
          functionDetails.called = true;
          functionToCall.apply(this, args);
        }
      }
    }
  };

  var _submissions = null;
  var waitOnSubmission = {};
  var formConfig = appForm.models.config;
  var defaultFunction = function(err){
    err = err ? err : "";
    $fh.forms.log.w("Default Function Called " + err);
  };

  /**
   * Get and set config values. Can only set a config value if you are an config_admin_user
   */
  var configInterface = {
    "editAllowed" : function(){
      var defaultConfigValues = formConfig.get("defaultConfigValues", {});
      return defaultConfigValues["config_admin_user"] === true;
    },
    "get" : function(key){
      var self = this;
      if(key){
        var userConfigValues = formConfig.get("userConfigValues", {});
        var defaultConfigValues = formConfig.get("defaultConfigValues", {});


        if(userConfigValues[key]){
          return userConfigValues[key];
        } else {
          return defaultConfigValues[key];
        }

      }
    },
    "getDeviceId": function(){
      return formConfig.get("deviceId", "Not Set");
    },
    "set" : function(key, val){
      var self = this;
      if(typeof(key) !== "string" || typeof(val) === "undefined" || val === null){
        return;
      }

      if(self.editAllowed() || key === "max_sent_saved"){
        var userConfig = formConfig.get("userConfigValues", {});
        userConfig[key] = val;
        formConfig.set("userConfigValues", userConfig);
      }

    },
    "getConfig" : function(){
      var self = this;
      var defaultValues = formConfig.get("defaultConfigValues", {});
      var userConfigValues = formConfig.get("userConfigValues", {});
      var returnObj = {};

      if(self.editAllowed()){
        for(var defKey in defaultValues){
          if(userConfigValues[defKey]){
            returnObj[defKey] = userConfigValues[defKey];
          } else {
            returnObj[defKey] = defaultValues[defKey];
          }
        }
        return returnObj;
      } else {
        return defaultValues;
      }
    },
    "saveConfig": function(cb){
      var self = this;
      formConfig.saveLocal(function(err, configModel){
        if(err){
          $fh.forms.log.e("Error saving a form config: ", err);
        }else{
          $fh.forms.log.l("Form config saved sucessfully.");
        }

        if(typeof(cb) ==='function'){
          cb();
        }
      });
    },
    "offline": function(){
      formConfig.setOffline();
    },
    "online": function(){
      formConfig.setOnline();
    },
    "mbaasOnline": function(cb){
      if(typeof(cb) === "function"){
        formConfig.on('online', cb);
      }
    },
    "mbaasOffline": function(cb){
      if(typeof(cb) === "function"){
        formConfig.on('offline', cb);
      }
    },
    "isOnline": function(){
      return formConfig.isOnline();
    },
    "isStudioMode": function(){
      return formConfig.isStudioMode();
    },
    refresh: function(cb){
      formConfig.refresh(true, cb);
    }
  };

  module.config = configInterface;


  /**
     * Retrieve forms model. It contains forms list. check forms model usage
     * @param  {[type]}   params {fromRemote:boolean}
     * @param  {Function} cb    (err, formsModel)
     * @return {[type]}          [description]
     */
  function getForms(params, cb) {
    if(typeof(params) === 'function'){
      cb = params;
      params = {};
    }

    params = params ? params : {};
    cb = cb ? cb : defaultFunction;
    var fromRemote = params.fromRemote;
    if (fromRemote === undefined) {
      fromRemote = false;
    }
    appForm.models.forms.refresh(fromRemote, cb);
  }
  /**
     * Retrieve form model with specified form id.
     * @param  {[type]}   params {formId: string, fromRemote:boolean}
     * @param  {Function} cb     (err, formModel)
     * @return {[type]}          [description]
     */
  function getForm(params, cb) {
    if(typeof(params) === 'function'){
      cb = params;
      params = {};
    }

    params = params ? params : {};
    cb = cb ? cb : defaultFunction;
    new appForm.models.Form(params, cb);
  }
  /**
     * Find a theme definition for this app.
     * @param params {fromRemote:boolean(false)}
     * @param {Function} cb {err, themeData} . themeData = {"json" : {<theme json definition>}, "css" : "css" : "<css style definition for this app>"}
     */
  function getTheme(params, cb) {
    if(typeof(params) === 'function'){
      cb = params;
      params = {};
    }

    params = params ? params : {};
    cb = cb ? cb : defaultFunction;
    var theme = appForm.models.theme;
    if (!params.fromRemote) {
      params.fromRemote = false;
    }
    theme.refresh(params.fromRemote, function (err, updatedTheme) {
      if (err) {
        return cb(err);
      }
      if (updatedTheme === null) {
        return cb(new Error('No theme defined for this app'));
      }
      if (params.css === true) {
        return cb(null, theme.getCSS());
      } else {
        return cb(null, theme);
      }
    });
  }
  /**
     * Get submissions that are submitted. I.e. submitted and complete.
     * @param params {}
     * @param {Function} cb     (err, submittedArray)
     */
  function getSubmissions(params, cb) {
    if(typeof(params) === 'function'){
      cb = params;
      params = {};
    }

    params = params ? params : {};
    cb = cb ? cb : defaultFunction;

    //Getting submissions that have been completed.
    var submissions = appForm.models.submissions;
    if (_submissions === null) {
      appForm.models.submissions.loadLocal(function (err) {
        if (err) {
          $fh.forms.log.e(err);
          cb(err);
        } else {
          _submissions = appForm.models.submissions;
          cb(null, _submissions);
        }
      });
    } else {
      cb(null, _submissions);
    }
  }
  function submitForm(submission, cb) {
    if (submission) {
      submission.submit(function (err) {
        if (err){
          return cb(err);
        }

        //Submission finished and validated. Now upload the form
        submission.upload(cb);
      });
    } else {
      return cb('Invalid submission object.');
    }
  }

  /*
     * Function for downloading a submission stored on the remote server.
     *
     * @param params {}
     * @param {function} cb (err, downloadTask)
     * */
    function downloadSubmission(params, cb) {
      $fh.forms.log.d("downloadSubmission called", params);
      params = params ? params : {};
      var waitCallbackPassed = typeof(cb) === "function";
      cb = typeof(cb) === "function" ? cb : function(){};

      //There should be a submission id to download.
      if(!params.submissionId){
        $fh.forms.log.e("No submissionId passed to download a submission");
        return cb("No submissionId passed to download a submission");
      }

      var submissionToDownload = null;

      function finishSubmissionDownload(err) {
        err = typeof(err) === "string" && err.length === 24 ? null : err;
        $fh.forms.log.d("finishSubmissionDownload ", err, submissionToDownload);
        var subCBId = submissionToDownload.getRemoteSubmissionId();
        var subsCbsWatiting = waitOnSubmission[subCBId];
        if (subsCbsWatiting) {
          var subCB = subsCbsWatiting.pop();
          while (typeof(subCB) === 'function') {
            subCB(err, submissionToDownload);
            subCB = subsCbsWatiting.pop();
          }

          if (submissionToDownload.clearEvents) {
            submissionToDownload.clearEvents();
          }
        } else {
          submissionToDownload.clearEvents();
          return cb(err, submissionToDownload);
        }
      }

      $fh.forms.log.d("downloadSubmission SubmissionId exists" + params.submissionId);
      var submissionAlreadySaved = appForm.models.submissions.findMetaByRemoteId(params.submissionId);

      if (submissionAlreadySaved === null) {

        $fh.forms.log.d("downloadSubmission submission does not exist, downloading", params);
        submissionToDownload = new appForm.models.submission.newInstance(null, {
          submissionId: params.submissionId
        });

        submissionToDownload.on('error', finishSubmissionDownload);

        submissionToDownload.on('downloaded', finishSubmissionDownload);

        if (typeof(params.updateFunction) === 'function') {
          submissionToDownload.on('progress', params.updateFunction);
        }

        //If there is no callback function, then just trigger the download.
        //Users can register global listeners for submission downloads events now.
        if(typeof(cb) === "function"){
          if(waitOnSubmission[params.submissionId]){
            waitOnSubmission[params.submissionId].push(cb);
          } else {
            waitOnSubmission[params.submissionId] = [];
            waitOnSubmission[params.submissionId].push(cb);
          }
        }

        submissionToDownload.download(function(err) {
          if (err) {
            $fh.forms.log.e("Error queueing submission for download " + err);
            return cb(err);
          }
        });
      } else {
        $fh.forms.log.d("downloadSubmission submission exists", params);

        //Submission was created, but not finished downloading
        if (submissionAlreadySaved.status !== "downloaded" && submissionAlreadySaved.status !== "submitted") {
          if(typeof(cb) === "function"){
            if(waitOnSubmission[params.submissionId]){
              waitOnSubmission[params.submissionId].push(cb);
            } else {
              waitOnSubmission[params.submissionId] = [];
              waitOnSubmission[params.submissionId].push(cb);
            }
          }
        } else {
          appForm.models.submissions.getSubmissionByMeta(submissionAlreadySaved, function(err, submission){
            if(err){
              return cb(err);
            }

            //If the submission has already been downloaded - emit the downloaded event again
            submission.emit('downloaded', submission.getRemoteSubmissionId());
            return cb(undefined, submission);
          });
        }
      }
    }
  return module;
}(appForm.api || {});
//mockup $fh apis for Addons.
if (typeof $fh === 'undefined') {
  $fh = {};
}
if ($fh.forms === undefined) {
  $fh.forms = appForm.api;
}
/*! fh-forms - v1.11.1 -  */
/*! async - v0.2.9 -  */
/*! 2017-01-03 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
  (function() {

    var async = require('async');
    var _ = require('underscore');
    var moment = require('moment');

    /*
     * Sample Usage
     *
     * var engine = formsRulesEngine(form-definition);
     *
     * engine.validateForms(form-submission, function(err, res) {});
     *      res:
     *      {
     *          "validation": {
     *              "fieldId": {
     *                  "fieldId": "",
     *                  "valid": true,
     *                  "errorMessages": [
     *                      "length should be 3 to 5",
     *                      "should not contain dammit",
     *                      "should repeat at least 2 times"
     *                  ]
     *              },
     *              "fieldId1": {
     *
     *              }
     *          }
     *      }
     *
     *
     * engine.validateField(fieldId, submissionJSON, function(err,res) {});
     *      // validate only field values on validation (no rules, no repeat checking)
     *      res:
     *      "validation":{
     *              "fieldId":{
     *                  "fieldId":"",
     *                  "valid":true,
     *                  "errorMessages":[
     *                      "length should be 3 to 5",
     *                      "should not contain dammit"
     *                  ]
     *              }
     *          }
     *
     * engine.checkRules(submissionJSON, unction(err, res) {})
     *      // check all rules actions
     *      res:
     *      {
     *          "actions": {
     *              "pages": {
     *                  "targetId": {
     *                      "targetId": "",
     *                      "action": "show|hide"
     *                  }
     *              },
     *              "fields": {
     *
     *              }
     *          }
     *      }
     *
     */

    var FIELD_TYPE_DATETIME_DATETIMEUNIT_DATEONLY = "date";
    var FIELD_TYPE_DATETIME_DATETIMEUNIT_TIMEONLY = "time";
    var FIELD_TYPE_DATETIME_DATETIMEUNIT_DATETIME = "datetime";

    var formsRulesEngine = function(formDef) {
      var initialised;

      var definition = formDef;
      var submission;

      var fieldMap = {};
      var adminFieldMap ={}; //Admin fields should not be part of a submission
      var requiredFieldMap = {};
      var submissionRequiredFieldsMap = {}; // map to hold the status of the required fields per submission
      var fieldRulePredicateMap = {};
      var fieldRuleSubjectMap = {};
      var pageRulePredicateMap = {};
      var pageRuleSubjectMap = {};
      var submissionFieldsMap = {};
      var validatorsMap = {
        "text": validatorString,
        "textarea": validatorString,
        "number": validatorNumericString,
        "emailAddress": validatorEmail,
        "dropdown": validatorDropDown,
        "radio": validatorRadio,
        "checkboxes": validatorCheckboxes,
        "location": validatorLocation,
        "locationMap": validatorLocationMap,
        "photo": validatorFile,
        "signature": validatorFile,
        "file": validatorFile,
        "dateTime": validatorDateTime,
        "url": validatorString,
        "sectionBreak": validatorSection,
        "barcode": validatorBarcode,
        "sliderNumber": validatorNumericString,
        "readOnly": function() {
          //readonly fields need no validation. Values are ignored.
          return true;
        }
      };

      var validatorsClientMap = {
        "text": validatorString,
        "textarea": validatorString,
        "number": validatorNumericString,
        "emailAddress": validatorEmail,
        "dropdown": validatorDropDown,
        "radio": validatorRadio,
        "checkboxes": validatorCheckboxes,
        "location": validatorLocation,
        "locationMap": validatorLocationMap,
        "photo": validatorAnyFile,
        "signature": validatorAnyFile,
        "file": validatorAnyFile,
        "dateTime": validatorDateTime,
        "url": validatorString,
        "sectionBreak": validatorSection,
        "barcode": validatorBarcode,
        "sliderNumber": validatorNumericString,
        "readOnly": function() {
          //readonly fields need no validation. Values are ignored.
          return true;
        }
      };

      var fieldValueComparison = {
        "text": function(fieldValue, testValue, condition) {
          return this.comparisonString(fieldValue, testValue, condition);
        },
        "textarea": function(fieldValue, testValue, condition) {
          return this.comparisonString(fieldValue, testValue, condition);
        },
        "number": function(fieldValue, testValue, condition) {
          return this.numericalComparison(fieldValue, testValue, condition);
        },
        "emailAddress": function(fieldValue, testValue, condition) {
          return this.comparisonString(fieldValue, testValue, condition);
        },
        "dropdown": function(fieldValue, testValue, condition) {
          return this.comparisonString(fieldValue, testValue, condition);
        },
        "radio": function(fieldValue, testValue, condition) {
          return this.comparisonString(fieldValue, testValue, condition);
        },
        "checkboxes": function(fieldValue, testValue, condition) {
          fieldValue = fieldValue || {};
          var valueFound = false;

          if (!(fieldValue.selections instanceof Array)) {
            return false;
          }

          //Check if the testValue is contained in the selections
          for (var selectionIndex = 0; selectionIndex < fieldValue.selections.length; selectionIndex++ ) {
            var selectionValue = fieldValue.selections[selectionIndex];
            //Note, here we are using the "is" string comparator to check if the testValue matches the current selectionValue
            if (this.comparisonString(selectionValue, testValue, "is")) {
              valueFound = true;
            }
          }

          if (condition === "is") {
            return valueFound;
          } else {
            return !valueFound;
          }

        },
        "dateTime": function(fieldValue, testValue, condition, fieldOptions) {
          var valid = false;

          fieldOptions = fieldOptions || {definition: {}};

          //dateNumVal is assigned an easily comparable number depending on the type of units used.
          var dateNumVal = null;
          var testNumVal = null;

          switch (fieldOptions.definition.datetimeUnit) {
            case FIELD_TYPE_DATETIME_DATETIMEUNIT_DATEONLY:
              try {
                dateNumVal = new Date(new Date(fieldValue).toDateString()).getTime();
                testNumVal = new Date(new Date(testValue).toDateString()).getTime();
                valid = true;
              } catch (e) {
                dateNumVal = null;
                testNumVal = null;
                valid = false;
              }
              break;
            case FIELD_TYPE_DATETIME_DATETIMEUNIT_TIMEONLY:
              var cvtTime = this.cvtTimeToSeconds(fieldValue);
              var cvtTestVal = this.cvtTimeToSeconds(testValue);
              dateNumVal = cvtTime.seconds;
              testNumVal = cvtTestVal.seconds;
              valid = cvtTime.valid && cvtTestVal.valid;
              break;
            case FIELD_TYPE_DATETIME_DATETIMEUNIT_DATETIME:
              try {
                dateNumVal = (new Date(fieldValue).getTime());
                testNumVal = (new Date(testValue).getTime());
                valid = true;
              } catch (e) {
                valid = false;
              }
              break;
            default:
              valid = false;
              break;
          }

          //The value is not valid, no point in comparing.
          if (!valid) {
            return false;
          }

          if ("is at" === condition) {
            valid = dateNumVal === testNumVal;
          } else if ("is before" === condition) {
            valid = dateNumVal < testNumVal;
          } else if ("is after" === condition) {
            valid = dateNumVal > testNumVal;
          } else {
            valid = false;
          }

          return valid;
        },
        "url": function(fieldValue, testValue, condition) {
          return this.comparisonString(fieldValue, testValue, condition);
        },
        "barcode": function(fieldValue, testValue, condition) {
          fieldValue = fieldValue || {};

          if (typeof(fieldValue.text) !== "string") {
            return false;
          }

          return this.comparisonString(fieldValue.text, testValue, condition);
        },
        "sliderNumber": function(fieldValue, testValue, condition) {
          return this.numericalComparison(fieldValue, testValue, condition);
        },
        "comparisonString": function(fieldValue, testValue, condition) {
          var valid = true;

          if ("is" === condition) {
            valid = fieldValue === testValue;
          } else if ("is not" === condition) {
            valid = fieldValue !== testValue;
          } else if ("contains" === condition) {
            valid = fieldValue.indexOf(testValue) !== -1;
          } else if ("does not contain" === condition) {
            valid = fieldValue.indexOf(testValue) === -1;
          } else if ("begins with" === condition) {
            valid = fieldValue.substring(0, testValue.length) === testValue;
          } else if ("ends with" === condition) {
            valid = fieldValue.substring(Math.max(0, (fieldValue.length - testValue.length)), fieldValue.length) === testValue;
          } else {
            valid = false;
          }

          return valid;
        },
        "numericalComparison": function(fieldValue, testValue, condition) {
          var fieldValNum = parseInt(fieldValue, 10);
          var testValNum = parseInt(testValue, 10);

          if (isNaN(fieldValNum) || isNaN(testValNum)) {
            return false;
          }

          if ("is equal to" === condition) {
            return fieldValNum === testValNum;
          } else if ("is less than" === condition) {
            return fieldValNum < testValNum;
          } else if ("is greater than" === condition) {
            return fieldValNum > testValNum;
          } else {
            return false;
          }
        },
        "cvtTimeToSeconds": function(fieldValue) {
          var valid = false;
          var seconds = 0;
          if (typeof fieldValue === "string") {
            var parts = fieldValue.split(':');
            valid = (parts.length === 2) || (parts.length === 3);
            if (valid) {
              valid = isNumberBetween(parts[0], 0, 23);
              seconds += (parseInt(parts[0], 10) * 60 * 60);
            }
            if (valid) {
              valid = isNumberBetween(parts[1], 0, 59);
              seconds += (parseInt(parts[1], 10) * 60);
            }
            if (valid && (parts.length === 3)) {
              valid = isNumberBetween(parts[2], 0, 59);
              seconds += parseInt(parts[2], 10);
            }
          }
          return {valid: valid, seconds: seconds};
        }
      };



      var isFieldRuleSubject = function(fieldId) {
        return !!fieldRuleSubjectMap[fieldId];
      };

      var isPageRuleSubject = function(pageId) {
        return !!pageRuleSubjectMap[pageId];
      };

      function buildFieldMap() {
        // Iterate over all fields in form definition & build fieldMap
        _.each(definition.pages, function(page) {
          _.each(page.fields, function(field) {
            field.pageId = page._id;

            /**
             * If the field is an admin field, then it is not considered part of validation for a submission.
             */
            if (field.adminOnly) {
              adminFieldMap[field._id] = field;
              return;
            }

            field.fieldOptions = field.fieldOptions ? field.fieldOptions : {};
            field.fieldOptions.definition = field.fieldOptions.definition ? field.fieldOptions.definition : {};
            field.fieldOptions.validation = field.fieldOptions.validation ? field.fieldOptions.validation : {};

            fieldMap[field._id] = field;

            if (field.required) {
              requiredFieldMap[field._id] = {
                field: field,
                submitted: false,
                validated: false,
                valueRequired: field.required
              };
            }

          });
        });
      }

      function buildFieldRuleMaps() {
        // Iterate over all rules in form definition & build ruleSubjectMap
        _.each(definition.fieldRules, function(rule) {
          _.each(rule.ruleConditionalStatements, function(ruleConditionalStatement) {
            var fieldId = ruleConditionalStatement.sourceField;
            fieldRulePredicateMap[fieldId] = fieldRulePredicateMap[fieldId] || [];
            fieldRulePredicateMap[fieldId].push(rule);
          });
          /**
           * Target fields are an array of fieldIds that can be targeted by a field rule
           * To maintain backwards compatibility, the case where the targetPage is not an array has to be considered
           * @type {*|Array}
           */
          if (_.isArray(rule.targetField)) {
            _.each(rule.targetField, function(targetField) {
              fieldRuleSubjectMap[targetField] = fieldRuleSubjectMap[targetField] || [];
              fieldRuleSubjectMap[targetField].push(rule);
            });
          } else {
            fieldRuleSubjectMap[rule.targetField] = fieldRuleSubjectMap[rule.targetField] || [];
            fieldRuleSubjectMap[rule.targetField].push(rule);
          }
        });
      }

      function buildPageRuleMap() {
        // Iterate over all rules in form definition & build ruleSubjectMap
        _.each(definition.pageRules, function(rule) {
          _.each(rule.ruleConditionalStatements, function(ruleConditionalStatement) {
            var fieldId = ruleConditionalStatement.sourceField;
            pageRulePredicateMap[fieldId] = pageRulePredicateMap[fieldId] || [];
            pageRulePredicateMap[fieldId].push(rule);
          });

          /**
           * Target pages are an array of pageIds that can be targeted by a page rule
           * To maintain backwards compatibility, the case where the targetPage is not an array has to be considered
           * @type {*|Array}
           */
          if (_.isArray(rule.targetPage)) {
            _.each(rule.targetPage, function(targetPage) {
              pageRuleSubjectMap[targetPage] = pageRuleSubjectMap[targetPage] || [];
              pageRuleSubjectMap[targetPage].push(rule);
            });
          } else {
            pageRuleSubjectMap[rule.targetPage] = pageRuleSubjectMap[rule.targetPage] || [];
            pageRuleSubjectMap[rule.targetPage].push(rule);
          }
        });
      }

      function buildSubmissionFieldsMap() {
        submissionRequiredFieldsMap = JSON.parse(JSON.stringify(requiredFieldMap)); // clone the map for use with this submission
        submissionFieldsMap = {}; // start with empty map, rulesEngine can be called with multiple submissions
        var error;

        // iterate over all the fields in the submissions and build a map for easier lookup
        _.each(submission.formFields, function(formField) {
          if (!formField.fieldId) {
            error = new Error("No fieldId in this submission entry: " + JSON.stringify(formField));
            return;
          }

          /**
           * If the field passed in a submission is an admin field, then return an error.
           */
          if (adminFieldMap[formField.fieldId]) {
            error = "Submission " + formField.fieldId + " is an admin field. Admin fields cannot be passed to the rules engine.";
            return;
          }

          submissionFieldsMap[formField.fieldId] = formField;
        });
        return error;
      }

      function init() {
        if (initialised) {
          return;
        }
        buildFieldMap();
        buildFieldRuleMaps();
        buildPageRuleMap();

        initialised = true;
      }

      function initSubmission(formSubmission) {
        init();
        submission = formSubmission;
        return buildSubmissionFieldsMap();
      }

      function getPreviousFieldValues(submittedField, previousSubmission, cb) {
        if (previousSubmission && previousSubmission.formFields) {
          async.filter(previousSubmission.formFields, function(formField, cb) {
            return cb(formField.fieldId.toString() === submittedField.fieldId.toString());
          }, function(results) {
            var previousFieldValues = null;
            if (results && results[0] && results[0].fieldValues) {
              previousFieldValues = results[0].fieldValues;
            }
            return cb(undefined, previousFieldValues);
          });
        } else {
          return cb();
        }
      }

      function validateForm(submission, previousSubmission, cb) {
        if ("function" === typeof previousSubmission) {
          cb = previousSubmission;
          previousSubmission = null;
        }
        init();
        var err = initSubmission(submission);
        if (err) {
          return cb(err);
        }
        async.waterfall([
          function(cb) {
            var response = {
              validation: {
                valid: true
              }
            };

            validateSubmittedFields(response, previousSubmission, cb);
          },
          checkIfRequiredFieldsNotSubmitted
        ], function(err, results) {
          if (err) {
            return cb(err);
          }

          return cb(undefined, results);
        });
      }

      function validateSubmittedFields(res, previousSubmission, cb) {
        // for each field, call validateField
        async.each(submission.formFields, function(submittedField, callback) {
          var fieldID = submittedField.fieldId;
          var fieldDef = fieldMap[fieldID];

          getPreviousFieldValues(submittedField, previousSubmission, function(err, previousFieldValues) {
            if (err) {
              return callback(err);
            }
            getFieldValidationStatus(submittedField, fieldDef, previousFieldValues, function(err, fieldRes) {
              if (err) {
                return callback(err);
              }

              if (!fieldRes.valid) {
                res.validation.valid = false; // indicate invalid form if any fields invalid
                res.validation[fieldID] = fieldRes; // add invalid field info to validate form result
              }

              return callback();
            });

          });
        }, function(err) {
          if (err) {
            return cb(err);
          }
          return cb(undefined, res);
        });
      }

      function checkIfRequiredFieldsNotSubmitted(res, cb) {
        async.each(Object.keys(submissionRequiredFieldsMap), function(requiredFieldId, cb) {
          var resField = {};
          var requiredField = submissionRequiredFieldsMap[requiredFieldId];

          if (!requiredField.submitted) {
            isFieldVisible(requiredFieldId, true, function(err, visible) {
              if (err) {
                return cb(err);
              }

              if (visible && requiredField.valueRequired) { // we only care about required fields if they are visible
                resField.fieldId = requiredFieldId;
                resField.valid = false;
                resField.fieldErrorMessage = ["Required Field Not Submitted"];
                res.validation[requiredFieldId] = resField;
                res.validation.valid = false;
              }
              return cb();
            });
          } else { // was included in submission
            return cb();
          }
        }, function(err) {
          if (err) {
            return cb(err);
          }

          return cb(undefined, res);
        });
      }

      /*
       * validate only field values on validation (no rules, no repeat checking)
       *     res:
       *     "validation":{
       *             "fieldId":{
       *                 "fieldId":"",
       *                 "valid":true,
       *                 "errorMessages":[
       *                     "length should be 3 to 5",
       *                     "should not contain dammit"
       *                 ]
       *             }
       *         }
       */
      function validateField(fieldId, submission, cb) {
        init();
        var err = initSubmission(submission);
        if (err) {
          return cb(err);
        }

        var submissionField = submissionFieldsMap[fieldId];
        var fieldDef = fieldMap[fieldId];
        getFieldValidationStatus(submissionField, fieldDef, null, function(err, res) {
          if (err) {
            return cb(err);
          }
          var ret = {
            validation: {}
          };
          ret.validation[fieldId] = res;
          return cb(undefined, ret);
        });
      }

      /*
       * validate only single field value (no rules, no repeat checking)
       * cb(err, result)
       * example of result:
       * "validation":{
       *         "fieldId":{
       *             "fieldId":"",
       *             "valid":true,
       *             "errorMessages":[
       *                 "length should be 3 to 5",
       *                 "should not contain dammit"
       *             ]
       *         }
       *     }
       */
      function validateFieldValue(fieldId, inputValue, valueIndex, cb) {
        if ("function" === typeof valueIndex) {
          cb = valueIndex;
          valueIndex = 0;
        }

        init();

        var fieldDefinition = fieldMap[fieldId];

        var required = false;
        if (fieldDefinition.repeating &&
          fieldDefinition.fieldOptions &&
          fieldDefinition.fieldOptions.definition &&
          fieldDefinition.fieldOptions.definition.minRepeat) {
          required = (valueIndex < fieldDefinition.fieldOptions.definition.minRepeat);
        } else {
          required = fieldDefinition.required;
        }

        var validation = (fieldDefinition.fieldOptions && fieldDefinition.fieldOptions.validation) ? fieldDefinition.fieldOptions.validation : undefined;

        if (validation && false === validation.validateImmediately) {
          var ret = {
            validation: {}
          };
          ret.validation[fieldId] = {
            "valid": true
          };
          return cb(undefined, ret);
        }

        var requiredFieldEntry = requiredFieldMap[fieldDefinition._id] || {valueRequired: required};

        if (fieldEmpty(inputValue)) {
          if (required && requiredFieldEntry.valueRequired) {
            return formatResponse("No value specified for required input", cb);
          } else {
            return formatResponse(undefined, cb); // optional field not supplied is valid
          }
        }

        // not empty need to validate
        getClientValidatorFunction(fieldDefinition.type, function(err, validator) {
          if (err) {
            return cb(err);
          }

          validator(inputValue, fieldDefinition, undefined, function(err) {
            var message;
            if (err) {
              if (err.message) {
                message = err.message;
              } else {
                message = "Unknown error message";
              }
            }
            formatResponse(message, cb);
          });
        });

        function formatResponse(msg, cb) {
          var messages = {
            errorMessages: []
          };
          if (msg) {
            messages.errorMessages.push(msg);
          }
          return createValidatorResponse(fieldId, messages, function(err, res) {
            if (err) {
              return cb(err);
            }
            var ret = {
              validation: {}
            };
            ret.validation[fieldId] = res;
            return cb(undefined, ret);
          });
        }
      }

      function createValidatorResponse(fieldId, messages, cb) {
        // intentionally not checking err here, used further down to get validation errors
        var res = {};
        res.fieldId = fieldId;
        res.errorMessages = messages.errorMessages || [];
        res.fieldErrorMessage = messages.fieldErrorMessage || [];
        async.some(res.errorMessages, function(item, cb) {
          return cb(item !== null);
        }, function(someErrors) {
          res.valid = !someErrors && (res.fieldErrorMessage.length < 1);

          return cb(undefined, res);
        });
      }

      function getFieldValidationStatus(submittedField, fieldDef, previousFieldValues, cb) {
        isFieldVisible(fieldDef._id, true, function(err, visible) {
          if (err) {
            return cb(err);
          }
          validateFieldInternal(submittedField, fieldDef, previousFieldValues, visible, function(err, messages) {
            if (err) {
              return cb(err);
            }
            createValidatorResponse(submittedField.fieldId, messages, cb);
          });
        });
      }

      function getMapFunction(key, map, cb) {
        var validator = map[key];
        if (!validator) {
          return cb(new Error("Invalid Field Type " + key));
        }

        return cb(undefined, validator);
      }

      function getValidatorFunction(fieldType, cb) {
        return getMapFunction(fieldType, validatorsMap, cb);
      }

      function getClientValidatorFunction(fieldType, cb) {
        return getMapFunction(fieldType, validatorsClientMap, cb);
      }

      function fieldEmpty(fieldValue) {
        return ('undefined' === typeof fieldValue || null === fieldValue || "" === fieldValue); // empty string also regarded as not specified
      }

      function validateFieldInternal(submittedField, fieldDef, previousFieldValues, visible, cb) {
        previousFieldValues = previousFieldValues || null;
        countSubmittedValues(submittedField, function(err, numSubmittedValues) {
          if (err) {
            return cb(err);
          }
          //Marking the visibility of the field on the definition.
          fieldDef.visible = visible;
          async.series({
            valuesSubmitted: async.apply(checkValueSubmitted, submittedField, fieldDef, visible),
            repeats: async.apply(checkRepeat, numSubmittedValues, fieldDef, visible),
            values: async.apply(checkValues, submittedField, fieldDef, previousFieldValues)
          }, function(err, results) {
            if (err) {
              return cb(err);
            }

            var fieldErrorMessages = [];
            if (results.valuesSubmitted) {
              fieldErrorMessages.push(results.valuesSubmitted);
            }
            if (results.repeats) {
              fieldErrorMessages.push(results.repeats);
            }
            return cb(undefined, {
              fieldErrorMessage: fieldErrorMessages,
              errorMessages: results.values
            });
          });
        });

        return; // just functions below this

        function checkValueSubmitted(submittedField, fieldDefinition, visible, cb) {
          if (!fieldDefinition.required) {
            return cb(undefined, null);
          }

          var valueSubmitted = submittedField && submittedField.fieldValues && (submittedField.fieldValues.length > 0);
          //No value submitted is only an error if the field is visible.

          //If the field value has been marked as not required, then don't fail a no-value submission
          var valueRequired = requiredFieldMap[fieldDefinition._id] && requiredFieldMap[fieldDefinition._id].valueRequired;

          if (!valueSubmitted && visible && valueRequired) {
            return cb(undefined, "No value submitted for field " + fieldDefinition.name);
          }
          return cb(undefined, null);

        }

        function countSubmittedValues(submittedField, cb) {
          var numSubmittedValues = 0;
          if (submittedField && submittedField.fieldValues && submittedField.fieldValues.length > 0) {
            for (var i = 0; i < submittedField.fieldValues.length; i += 1) {
              if (submittedField.fieldValues[i]) {
                numSubmittedValues += 1;
              }
            }
          }
          return cb(undefined, numSubmittedValues);
        }

        function checkRepeat(numSubmittedValues, fieldDefinition, visible, cb) {
          //If the field is not visible, then checking the repeating values of the field is not required
          if (!visible) {
            return cb(undefined, null);
          }

          if (fieldDefinition.repeating && fieldDefinition.fieldOptions && fieldDefinition.fieldOptions.definition) {
            if (fieldDefinition.fieldOptions.definition.minRepeat) {
              if (numSubmittedValues < fieldDefinition.fieldOptions.definition.minRepeat) {
                return cb(undefined, "Expected min of " + fieldDefinition.fieldOptions.definition.minRepeat + " values for field " + fieldDefinition.name + " but got " + numSubmittedValues);
              }
            }

            if (fieldDefinition.fieldOptions.definition.maxRepeat) {
              if (numSubmittedValues > fieldDefinition.fieldOptions.definition.maxRepeat) {
                return cb(undefined, "Expected max of " + fieldDefinition.fieldOptions.definition.maxRepeat + " values for field " + fieldDefinition.name + " but got " + numSubmittedValues);
              }
            }
          } else {
            if (numSubmittedValues > 1) {
              return cb(undefined, "Should not have multiple values for non-repeating field");
            }
          }

          return cb(undefined, null);
        }

        function checkValues(submittedField, fieldDefinition, previousFieldValues, cb) {
          getValidatorFunction(fieldDefinition.type, function(err, validator) {
            if (err) {
              return cb(err);
            }
            async.map(submittedField.fieldValues, function(fieldValue, cb) {
              if (fieldEmpty(fieldValue)) {
                return cb(undefined, null);
              } else {
                validator(fieldValue, fieldDefinition, previousFieldValues, function(validationError) {
                  var errorMessage;
                  if (validationError) {
                    errorMessage = validationError.message || "Error during validation of field";
                  } else {
                    errorMessage = null;
                  }

                  if (submissionRequiredFieldsMap[fieldDefinition._id]) { // set to true if at least one value
                    submissionRequiredFieldsMap[fieldDefinition._id].submitted = true;
                  }

                  return cb(undefined, errorMessage);
                });
              }
            }, function(err, results) {
              if (err) {
                return cb(err);
              }

              return cb(undefined, results);
            });
          });
        }
      }

      function convertSimpleFormatToRegex(field_format_string) {
        var regex = "^";
        var C = "c".charCodeAt(0);
        var N = "n".charCodeAt(0);

        var i;
        var ch;
        var match;
        var len = field_format_string.length;
        for (i = 0; i < len; i += 1) {
          ch = field_format_string.charCodeAt(i);
          switch (ch) {
            case C:
              match = "[a-zA-Z0-9]";
              break;
            case N:
              match = "[0-9]";
              break;
            default:
              var num = ch.toString(16).toUpperCase();
              match = "\\u" + ("0000" + num).substr(-4);
              break;
          }
          regex += match;
        }
        return regex + "$";
      }

      function validFormatRegex(fieldValue, field_format_string) {
        var pattern = new RegExp(field_format_string);
        return pattern.test(fieldValue);
      }

      function validFormat(fieldValue, field_format_mode, field_format_string) {
        var regex;
        if ("simple" === field_format_mode) {
          regex = convertSimpleFormatToRegex(field_format_string);
        } else if ("regex" === field_format_mode) {
          regex = field_format_string;
        } else { // should never be anything else, but if it is then default to simple format
          regex = convertSimpleFormatToRegex(field_format_string);
        }

        return validFormatRegex(fieldValue, regex);
      }

      function validatorString(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (typeof fieldValue !== "string") {
          return cb(new Error("Expected string but got " + typeof(fieldValue)));
        }

        var validation = {};
        if (fieldDefinition && fieldDefinition.fieldOptions && fieldDefinition.fieldOptions.validation) {
          validation = fieldDefinition.fieldOptions.validation;
        }

        var field_format_mode = validation.field_format_mode || "";
        field_format_mode = field_format_mode.trim();
        var field_format_string = validation.field_format_string || "";
        field_format_string = field_format_string.trim();

        if (field_format_string && (field_format_string.length > 0) && field_format_mode && (field_format_mode.length > 0)) {
          if (!validFormat(fieldValue, field_format_mode, field_format_string)) {
            return cb(new Error("field value in incorrect format, expected format: " + field_format_string + " but submission value is: " + fieldValue));
          }
        }

        if (fieldDefinition.fieldOptions && fieldDefinition.fieldOptions.validation && fieldDefinition.fieldOptions.validation.min) {
          if (fieldValue.length < fieldDefinition.fieldOptions.validation.min) {
            return cb(new Error("Expected minimum string length of " + fieldDefinition.fieldOptions.validation.min + " but submission is " + fieldValue.length + ". Submitted val: " + fieldValue));
          }
        }

        if (fieldDefinition.fieldOptions && fieldDefinition.fieldOptions.validation && fieldDefinition.fieldOptions.validation.max) {
          if (fieldValue.length > fieldDefinition.fieldOptions.validation.max) {
            return cb(new Error("Expected maximum string length of " + fieldDefinition.fieldOptions.validation.max + " but submission is " + fieldValue.length + ". Submitted val: " + fieldValue));
          }
        }

        return cb();
      }

      function validatorNumericString(fieldValue, fieldDefinition, previousFieldValues, cb) {
        var testVal = (fieldValue - 0); // coerce to number (or NaN)
        /* eslint-disable eqeqeq */
        var numeric = (testVal == fieldValue); // testVal co-erced to numeric above, so numeric comparison and NaN != NaN

        if (!numeric) {
          return cb(new Error("Expected numeric but got: " + fieldValue));
        }

        return validatorNumber(testVal, fieldDefinition, previousFieldValues, cb);
      }

      function validatorNumber(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (typeof fieldValue !== "number") {
          return cb(new Error("Expected number but got " + typeof(fieldValue)));
        }

        if (fieldDefinition.fieldOptions && fieldDefinition.fieldOptions.validation && fieldDefinition.fieldOptions.validation.min) {
          if (fieldValue < fieldDefinition.fieldOptions.validation.min) {
            return cb(new Error("Expected minimum Number " + fieldDefinition.fieldOptions.validation.min + " but submission is " + fieldValue + ". Submitted number: " + fieldValue));
          }
        }

        if (fieldDefinition.fieldOptions.validation.max) {
          if (fieldValue > fieldDefinition.fieldOptions.validation.max) {
            return cb(new Error("Expected maximum Number " + fieldDefinition.fieldOptions.validation.max + " but submission is " + fieldValue + ". Submitted number: " + fieldValue));
          }
        }

        return cb();
      }

      function validatorEmail(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (typeof(fieldValue) !== "string") {
          return cb(new Error("Expected string but got " + typeof(fieldValue)));
        }

        if (fieldValue.match(/[-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\.[a-zA-Z]{2,4}/g) === null) {
          return cb(new Error("Invalid email address format: " + fieldValue));
        } else {
          return cb();
        }
      }


      /**
       * validatorDropDown - Validator function for dropdown fields.
       *
       * @param  {string} fieldValue        The value to validate
       * @param  {object} fieldDefinition   Full JSON definition of the field
       * @param  {array} previousFieldValues Any values previously stored with the fields
       * @param  {function} cb               Callback function
       */
      function validatorDropDown(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (typeof(fieldValue) !== "string") {
          return cb(new Error("Expected submission to be string but got " + typeof(fieldValue)));
        }

        fieldDefinition.fieldOptions = fieldDefinition.fieldOptions || {};
        fieldDefinition.fieldOptions.definition = fieldDefinition.fieldOptions.definition || {};

        //Check values exists in the field definition
        if (!fieldDefinition.fieldOptions.definition.options) {
          return cb(new Error("No options exist for field " + fieldDefinition.name));
        }

        //Finding the selected option
        var found = _.find(fieldDefinition.fieldOptions.definition.options, function(dropdownOption) {
          return dropdownOption.label === fieldValue;
        });

        //Valid option, can return
        if (found) {
          return cb();
        }

        //If the option is empty and the field is required, then the blank option is being submitted
        //The blank option is not valid for a required field.
        if (found === "" && fieldDefinition.required && fieldDefinition.fieldOptions.definition.include_blank_option) {
          return cb(new Error("The Blank Option is not valid. Please select a value."));
        } else {
          //Otherwise, it is an invalid option
          return cb(new Error("Invalid option specified: " + fieldValue));
        }
      }

      /**
       * validatorRadio - Validator function for radio fields.
       *
       * @param  {string} fieldValue        The value to validate
       * @param  {object} fieldDefinition   Full JSON definition of the field
       * @param  {array} previousFieldValues Any values previously stored with the fields
       * @param  {function} cb               Callback function
       */
      function validatorRadio(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (typeof(fieldValue) !== "string") {
          return cb(new Error("Expected submission to be string but got " + typeof(fieldValue)));
        }

        //Check value exists in the field definition
        if (!fieldDefinition.fieldOptions.definition.options) {
          return cb(new Error("No options exist for field " + fieldDefinition.name));
        }

        async.some(fieldDefinition.fieldOptions.definition.options, function(dropdownOption, cb) {
          return cb(dropdownOption.label === fieldValue);
        }, function(found) {
          if (!found) {
            return cb(new Error("Invalid option specified: " + fieldValue));
          } else {
            return cb();
          }
        });
      }

      function validatorCheckboxes(fieldValue, fieldDefinition, previousFieldValues, cb) {
        var minVal;

        if (fieldDefinition && fieldDefinition.fieldOptions && fieldDefinition.fieldOptions.validation) {
          minVal = fieldDefinition.fieldOptions.validation.min;
        }
        var maxVal;
        if (fieldDefinition && fieldDefinition.fieldOptions && fieldDefinition.fieldOptions.validation) {
          maxVal = fieldDefinition.fieldOptions.validation.max;
        }

        if (minVal) {
          if (fieldValue.selections === null || fieldValue.selections === undefined || fieldValue.selections.length < minVal && fieldDefinition.visible) {
            var len;
            if (fieldValue.selections) {
              len = fieldValue.selections.length;
            }
            return cb(new Error("Expected a minimum number of selections " + minVal + " but got " + len));
          }
        }

        if (maxVal) {
          if (fieldValue.selections) {
            if (fieldValue.selections.length > maxVal) {
              return cb(new Error("Expected a maximum number of selections " + maxVal + " but got " + fieldValue.selections.length));
            }
          }
        }

        var optionsInCheckbox = [];

        async.eachSeries(fieldDefinition.fieldOptions.definition.options, function(choice, cb) {
          for (var choiceName in choice) { // eslint-disable-line guard-for-in
            optionsInCheckbox.push(choice[choiceName]);
          }
          return cb();
        }, function() {
          async.eachSeries(fieldValue.selections, function(selection, cb) {
            if (typeof(selection) !== "string") {
              return cb(new Error("Expected checkbox submission to be string but got " + typeof(selection)));
            }

            if (optionsInCheckbox.indexOf(selection) === -1) {
              return cb(new Error("Checkbox Option " + selection + " does not exist in the field."));
            }

            return cb();
          }, cb);
        });
      }

      function validatorLocationMap(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (fieldValue.lat && fieldValue["long"]) {
          if (isNaN(parseFloat(fieldValue.lat)) || isNaN(parseFloat(fieldValue["long"]))) {
            return cb(new Error("Invalid latitude and longitude values"));
          } else {
            return cb();
          }
        } else {
          return cb(new Error("Invalid object for locationMap submission"));
        }
      }


      function validatorLocation(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (fieldDefinition.fieldOptions.definition.locationUnit === "latlong") {
          if (fieldValue.lat && fieldValue["long"]) {
            if (isNaN(parseFloat(fieldValue.lat)) || isNaN(parseFloat(fieldValue["long"]))) {
              return cb(new Error("Invalid latitude and longitude values"));
            } else {
              return cb();
            }
          } else {
            return cb(new Error("Invalid object for latitude longitude submission"));
          }
        } else {
          if (fieldValue.zone && fieldValue.eastings && fieldValue.northings) {
            //Zone must be 3 characters, eastings 6 and northings 9
            return validateNorthingsEastings(fieldValue, cb);
          } else {
            return cb(new Error("Invalid object for northings easting submission. Zone, Eastings and Northings elements are required"));
          }
        }

        function validateNorthingsEastings(fieldValue, cb) {
          if (typeof(fieldValue.zone) !== "string" || fieldValue.zone.length === 0) {
            return cb(new Error("Invalid zone definition for northings and eastings location. " + fieldValue.zone));
          }

          var east = parseInt(fieldValue.eastings, 10);
          if (isNaN(east)) {
            return cb(new Error("Invalid eastings definition for northings and eastings location. " + fieldValue.eastings));
          }

          var north = parseInt(fieldValue.northings, 10);
          if (isNaN(north)) {
            return cb(new Error("Invalid northings definition for northings and eastings location. " + fieldValue.northings));
          }

          return cb();
        }
      }

      function validatorAnyFile(fieldValue, fieldDefinition, previousFieldValues, cb) {
        // if any of the following validators return ok, then return ok.
        validatorBase64(fieldValue, fieldDefinition, previousFieldValues, function(err) {
          if (!err) {
            return cb();
          }
          validatorFile(fieldValue, fieldDefinition, previousFieldValues, function(err) {
            if (!err) {
              return cb();
            }
            validatorFileObj(fieldValue, fieldDefinition, previousFieldValues, function(err) {
              if (!err) {
                return cb();
              }
              return cb(err);
            });
          });
        });
      }

      /**
       * Function to validate a barcode submission
       *
       * Must be an object with the following contents
       *
       * {
     *   text: "<<content of barcode>>",
     *   format: "<<barcode content format>>"
     * }
       *
       * @param fieldValue
       * @param fieldDefinition
       * @param previousFieldValues
       * @param cb
       */
      function validatorBarcode(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (typeof(fieldValue) !== "object" || fieldValue === null) {
          return cb(new Error("Expected object but got " + typeof(fieldValue)));
        }

        if (typeof(fieldValue.text) !== "string" || fieldValue.text.length === 0) {
          return cb(new Error("Expected text parameter."));
        }

        if (typeof(fieldValue.format) !== "string" || fieldValue.format.length === 0) {
          return cb(new Error("Expected format parameter."));
        }

        return cb();
      }

      function checkFileSize(fieldDefinition, fieldValue, sizeKey, cb) {
        fieldDefinition = fieldDefinition || {};
        var fieldOptions = fieldDefinition.fieldOptions || {};
        var fieldOptionsDef = fieldOptions.definition || {};
        var fileSizeMax = fieldOptionsDef.file_size || null; //FileSizeMax will be in KB. File size is in bytes

        if (fileSizeMax !== null) {
          var fieldValueSize = fieldValue[sizeKey];
          var fieldValueSizeKB = 1;
          if (fieldValueSize > 1000) {
            fieldValueSizeKB = fieldValueSize / 1000;
          }
          if (fieldValueSize > (fileSizeMax * 1000)) {
            return cb(new Error("File size is too large. File can be a maximum of " + fileSizeMax + "KB. Size of file selected: " + fieldValueSizeKB + "KB"));
          } else {
            return cb();
          }
        } else {
          return cb();
        }
      }

      function validatorFile(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (typeof fieldValue !== "object") {
          return cb(new Error("Expected object but got " + typeof(fieldValue)));
        }

        var keyTypes = [
          {
            keyName: "fileName",
            valueType: "string"
          },
          {
            keyName: "fileSize",
            valueType: "number"
          },
          {
            keyName: "fileType",
            valueType: "string"
          },
          {
            keyName: "fileUpdateTime",
            valueType: "number"
          },
          {
            keyName: "hashName",
            valueType: "string"
          }
        ];

        async.each(keyTypes, function(keyType, cb) {
          var actualType = typeof fieldValue[keyType.keyName];
          if (actualType !== keyType.valueType) {
            return cb(new Error("Expected " + keyType.valueType + " but got " + actualType));
          }
          if (keyType.keyName === "fileName" && fieldValue[keyType.keyName].length <= 0) {
            return cb(new Error("Expected value for " + keyType.keyName));
          }

          return cb();
        }, function(err) {
          if (err) {
            return cb(err);
          }

          checkFileSize(fieldDefinition, fieldValue, "fileSize", function(err) {
            if (err) {
              return cb(err);
            }

            if (fieldValue.hashName.indexOf("filePlaceHolder") > -1) { //TODO abstract out to config
              return cb();
            } else if (previousFieldValues && previousFieldValues.hashName && previousFieldValues.hashName.indexOf(fieldValue.hashName) > -1) {
              return cb();
            } else {
              return cb(new Error("Invalid file placeholder text" + fieldValue.hashName));
            }
          });
        });
      }

      function validatorFileObj(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if ((typeof File !== "function")) {
          return cb(new Error("Expected File object but got " + typeof(fieldValue)));
        }

        var keyTypes = [
          {
            keyName: "name",
            valueType: "string"
          },
          {
            keyName: "size",
            valueType: "number"
          }
        ];

        async.each(keyTypes, function(keyType, cb) {
          var actualType = typeof fieldValue[keyType.keyName];
          if (actualType !== keyType.valueType) {
            return cb(new Error("Expected " + keyType.valueType + " but got " + actualType));
          }
          if (actualType === "string" && fieldValue[keyType.keyName].length <= 0) {
            return cb(new Error("Expected value for " + keyType.keyName));
          }
          if (actualType === "number" && fieldValue[keyType.keyName] <= 0) {
            return cb(new Error("Expected > 0 value for " + keyType.keyName));
          }

          return cb();
        }, function(err) {
          if (err) {
            return cb(err);
          }


          checkFileSize(fieldDefinition, fieldValue, "size", function(err) {
            if (err) {
              return cb(err);
            }
            return cb();
          });
        });
      }

      function validatorBase64(fieldValue, fieldDefinition, previousFieldValues, cb) {
        if (typeof fieldValue !== "string") {
          return cb(new Error("Expected base64 string but got " + typeof(fieldValue)));
        }

        if (fieldValue.length <= 0) {
          return cb(new Error("Expected base64 string but was empty"));
        }

        return cb();
      }

      function validatorDateTime(fieldValue, fieldDefinition, previousFieldValues, cb) {
        var valid = false;

        if (typeof(fieldValue) !== "string") {
          return cb(new Error("Expected string but got " + typeof(fieldValue)));
        }

        switch (fieldDefinition.fieldOptions.definition.datetimeUnit) {
          case FIELD_TYPE_DATETIME_DATETIMEUNIT_DATEONLY:

            var validDateFormats = ["YYYY/MM/DD", "YYYY/MM/DD", "YYYY-MM-DD", "YYYY-MM-DD"];

            valid = _.find(validDateFormats, function(expectedFormat) {
              return moment(fieldValue, expectedFormat, true).isValid();
            });

            if (valid) {
              return cb();
            } else {
              return cb(new Error("Invalid date value " + fieldValue + ". Date format is YYYY/MM/DD"));
            }
            break; // eslint-disable-line no-unreachable
          case FIELD_TYPE_DATETIME_DATETIMEUNIT_TIMEONLY:
            valid = moment(fieldValue, "HH:mm:ss", true).isValid() || moment(fieldValue, "HH:mm", true).isValid();
            if (valid) {
              return cb();
            } else {
              return cb(new Error("Invalid time value " + fieldValue + ". Time format is HH:mm:ss or HH:mm"));
            }
            break; // eslint-disable-line no-unreachable
          case FIELD_TYPE_DATETIME_DATETIMEUNIT_DATETIME:
            var validDateTimeFormats = fieldDefinition.fieldOptions.definition.dateTimeFormat ? [fieldDefinition.fieldOptions.definition.dateTimeFormat] : ["YYYY/MM/DD HH:mm:ss", "YYYY/MM/DD HH:mm", "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"];

            valid = _.find(validDateTimeFormats, function(expectedFormat) {
              return moment(fieldValue, expectedFormat, true).isValid();
            });

            if (valid) {
              return cb();
            } else {
              return cb(new Error("Invalid dateTime string " + fieldValue + ". dateTime format is " + validDateTimeFormats.join(" or ")));
            }
            break; // eslint-disable-line no-unreachable
          default:
            return cb(new Error("Invalid dateTime fieldtype " + fieldDefinition.fieldOptions.definition.datetimeUnit));
        }
      }

      function validatorSection(value, fieldDefinition, previousFieldValues, cb) {
        return cb(new Error("Should not submit section field: " + fieldDefinition.name));
      }

      function rulesResult(rules, cb) {
        var visible = true;

        // Iterate over each rule that this field is a predicate of
        async.each(rules, function(rule, cbRule) {
          // For each rule, iterate over the predicate fields and evaluate the rule
          var predicateMapQueries = [];
          var predicateMapPassed = [];
          async.each(rule.ruleConditionalStatements, function(ruleConditionalStatement, cbPredicates) {
            var field = fieldMap[ruleConditionalStatement.sourceField];
            var passed = false;
            var submissionValues = [];
            var condition;
            var testValue;
            if (submissionFieldsMap[ruleConditionalStatement.sourceField] && submissionFieldsMap[ruleConditionalStatement.sourceField].fieldValues) {
              submissionValues = submissionFieldsMap[ruleConditionalStatement.sourceField].fieldValues;
              condition = ruleConditionalStatement.restriction;
              testValue = ruleConditionalStatement.sourceValue;

              // Validate rule predicates on the first entry only.
              passed = isConditionActive(field, submissionValues[0], testValue, condition);
            }
            predicateMapQueries.push({
              "field": field,
              "submissionValues": submissionValues,
              "condition": condition,
              "testValue": testValue,
              "passed": passed
            });

            if (passed) {
              predicateMapPassed.push(field);
            }
            return cbPredicates();
          }, function(err) {
            if (err) {
              cbRule(err);
            }

            function rulesPassed(condition, passed, queries) {
              return ((condition === "and") && ((passed.length === queries.length))) || // "and" condition - all rules must pass
                ((condition === "or") && ((passed.length > 0))); // "or" condition - only one rule must pass
            }

            /**
             * If any rule condition that targets the field/page hides that field/page, then the page is hidden.
             * Hiding the field/page takes precedence over any show. This will maintain consistency.
             * E.g. if x is y then hide p1,p2 takes precedence over if x is z then show p1, p2
             */
            if (rulesPassed(rule.ruleConditionalOperator, predicateMapPassed, predicateMapQueries)) {
              visible = (rule.type === "show") && visible;
            } else {
              visible = (rule.type !== "show") && visible;
            }

            return cbRule();
          });
        }, function(err) {
          if (err) {
            return cb(err);
          }

          return cb(undefined, visible);
        });
      }

      function isPageVisible(pageId, cb) {
        init();
        if (isPageRuleSubject(pageId)) { // if the page is the target of a rule
          return rulesResult(pageRuleSubjectMap[pageId], cb); // execute page rules
        } else {
          return cb(undefined, true); // if page is not subject of any rule then must be visible
        }
      }

      function isFieldVisible(fieldId, checkContainingPage, cb) {
        /*
         * fieldId = Id of field to check for rule predicate references
         * checkContainingPage = if true check page containing field, and return false if the page is hidden
         */
        init();
        // Fields are visible by default
        var field = fieldMap[fieldId];

        /**
         * If the field is an admin field, the rules engine returns an error, as admin fields cannot be the subject of rules engine actions.
         */
        if (adminFieldMap[fieldId]) {
          return cb(new Error("Submission " + fieldId + " is an admin field. Admin fields cannot be passed to the rules engine."));
        } else if (!field) {
          return cb(new Error("Field does not exist in form"));
        }

        async.waterfall([

          function testPage(cb) {
            if (checkContainingPage) {
              isPageVisible(field.pageId, cb);
            } else {
              return cb(undefined, true);
            }
          },
          function testField(pageVisible, cb) {
            if (!pageVisible) { // if page containing field is not visible then don't need to check field
              return cb(undefined, false);
            }

            if (isFieldRuleSubject(fieldId)) { // If the field is the subject of a rule it may have been hidden
              return rulesResult(fieldRuleSubjectMap[fieldId], cb); // execute field rules
            } else {
              return cb(undefined, true); // if not subject of field rules then can't be hidden
            }
          }
        ], cb);
      }

      /*
       * check all rules actions
       *      res:
       *      {
       *          "actions": {
       *              "pages": {
       *                  "targetId": {
       *                      "targetId": "",
       *                      "action": "show|hide"
       *                  }
       *              },
       *              "fields": {
       *              }
       *          }
       *      }
       */
      function checkRules(submissionJSON, cb) {
        init();
        var err = initSubmission(submissionJSON);
        if (err) {
          return cb(err);
        }
        var actions = {};

        async.parallel([

          function(cb) {
            actions.fields = {};
            async.eachSeries(Object.keys(fieldRuleSubjectMap), function(fieldId, cb) {
              isFieldVisible(fieldId, false, function(err, fieldVisible) {
                if (err) {
                  return cb(err);
                }
                actions.fields[fieldId] = {
                  targetId: fieldId,
                  action: (fieldVisible ? "show" : "hide")
                };
                return cb();
              });
            }, cb);
          },
          function(cb) {
            actions.pages = {};
            async.eachSeries(Object.keys(pageRuleSubjectMap), function(pageId, cb) {
              isPageVisible(pageId, function(err, pageVisible) {
                if (err) {
                  return cb(err);
                }
                actions.pages[pageId] = {
                  targetId: pageId,
                  action: (pageVisible ? "show" : "hide")
                };
                return cb();
              });
            }, cb);
          }
        ], function(err) {
          if (err) {
            return cb(err);
          }

          return cb(undefined, {
            actions: actions
          });
        });
      }

      function isConditionActive(field, fieldValue, testValue, condition) {

        var fieldType = field.type;
        var fieldOptions = field.fieldOptions ? field.fieldOptions : {};

        if (typeof(fieldValue) === 'undefined' || fieldValue === null) {
          return false;
        }

        if (typeof(fieldValueComparison[fieldType]) === "function") {
          return fieldValueComparison[fieldType](fieldValue, testValue, condition, fieldOptions);
        } else {
          return false;
        }

      }

      function isNumberBetween(num, min, max) {
        var numVal = parseInt(num, 10);
        return (!isNaN(numVal) && (numVal >= min) && (numVal <= max));
      }

      return {
        validateForm: validateForm,
        validateField: validateField,
        validateFieldValue: validateFieldValue,
        checkRules: checkRules,

        // The following are used internally, but exposed for tests
        validateFieldInternal: validateFieldInternal,
        initSubmission: initSubmission,
        isFieldVisible: isFieldVisible,
        isConditionActive: isConditionActive
      };
    };

    if (typeof module !== 'undefined' && module.exports) {
      module.exports = formsRulesEngine;
    }

    /*globals appForm */
    if (typeof appForm !== 'undefined') {
      appForm.RulesEngine = formsRulesEngine;
    }
  }());

},{"async":2,"moment":4,"underscore":5}],2:[function(require,module,exports){
  (function (process){
    /*global setImmediate: false, setTimeout: false, console: false */
    (function () {

      var async = {};

      // global on the server, window in the browser
      var root, previous_async;

      root = this;
      if (root != null) {
        previous_async = root.async;
      }

      async.noConflict = function () {
        root.async = previous_async;
        return async;
      };

      function only_once(fn) {
        var called = false;
        return function() {
          if (called) throw new Error("Callback was already called.");
          called = true;
          fn.apply(root, arguments);
        }
      }

      //// cross-browser compatiblity functions ////

      var _each = function (arr, iterator) {
        if (arr.forEach) {
          return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
          iterator(arr[i], i, arr);
        }
      };

      var _map = function (arr, iterator) {
        if (arr.map) {
          return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
          results.push(iterator(x, i, a));
        });
        return results;
      };

      var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
          return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
          memo = iterator(memo, x, i, a);
        });
        return memo;
      };

      var _keys = function (obj) {
        if (Object.keys) {
          return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
          if (obj.hasOwnProperty(k)) {
            keys.push(k);
          }
        }
        return keys;
      };

      //// exported async module functions ////

      //// nextTick implementation with browser-compatible fallback ////
      if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
          async.nextTick = function (fn) {
            // not a direct alias for IE10 compatibility
            setImmediate(fn);
          };
          async.setImmediate = async.nextTick;
        }
        else {
          async.nextTick = function (fn) {
            setTimeout(fn, 0);
          };
          async.setImmediate = async.nextTick;
        }
      }
      else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
          async.setImmediate = setImmediate;
        }
        else {
          async.setImmediate = async.nextTick;
        }
      }

      async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
          return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
          iterator(x, only_once(function (err) {
            if (err) {
              callback(err);
              callback = function () {};
            }
            else {
              completed += 1;
              if (completed >= arr.length) {
                callback(null);
              }
            }
          }));
        });
      };
      async.forEach = async.each;

      async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
          return callback();
        }
        var completed = 0;
        var iterate = function () {
          iterator(arr[completed], function (err) {
            if (err) {
              callback(err);
              callback = function () {};
            }
            else {
              completed += 1;
              if (completed >= arr.length) {
                callback(null);
              }
              else {
                iterate();
              }
            }
          });
        };
        iterate();
      };
      async.forEachSeries = async.eachSeries;

      async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
      };
      async.forEachLimit = async.eachLimit;

      var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
          callback = callback || function () {};
          if (!arr.length || limit <= 0) {
            return callback();
          }
          var completed = 0;
          var started = 0;
          var running = 0;

          (function replenish () {
            if (completed >= arr.length) {
              return callback();
            }

            while (running < limit && started < arr.length) {
              started += 1;
              running += 1;
              iterator(arr[started - 1], function (err) {
                if (err) {
                  callback(err);
                  callback = function () {};
                }
                else {
                  completed += 1;
                  running -= 1;
                  if (completed >= arr.length) {
                    callback();
                  }
                  else {
                    replenish();
                  }
                }
              });
            }
          })();
        };
      };


      var doParallel = function (fn) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [async.each].concat(args));
        };
      };
      var doParallelLimit = function(limit, fn) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
      };
      var doSeries = function (fn) {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [async.eachSeries].concat(args));
        };
      };


      var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
          return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
          iterator(x.value, function (err, v) {
            results[x.index] = v;
            callback(err);
          });
        }, function (err) {
          callback(err, results);
        });
      };
      async.map = doParallel(_asyncMap);
      async.mapSeries = doSeries(_asyncMap);
      async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
      };

      var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
      };

      // reduce only has a series version, as doing reduce in parallel won't
      // work in many situations.
      async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
          iterator(memo, x, function (err, v) {
            memo = v;
            callback(err);
          });
        }, function (err) {
          callback(err, memo);
        });
      };
      // inject alias
      async.inject = async.reduce;
      // foldl alias
      async.foldl = async.reduce;

      async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
          return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
      };
      // foldr alias
      async.foldr = async.reduceRight;

      var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
          return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
          iterator(x.value, function (v) {
            if (v) {
              results.push(x);
            }
            callback();
          });
        }, function (err) {
          callback(_map(results.sort(function (a, b) {
            return a.index - b.index;
          }), function (x) {
            return x.value;
          }));
        });
      };
      async.filter = doParallel(_filter);
      async.filterSeries = doSeries(_filter);
      // select alias
      async.select = async.filter;
      async.selectSeries = async.filterSeries;

      var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
          return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
          iterator(x.value, function (v) {
            if (!v) {
              results.push(x);
            }
            callback();
          });
        }, function (err) {
          callback(_map(results.sort(function (a, b) {
            return a.index - b.index;
          }), function (x) {
            return x.value;
          }));
        });
      };
      async.reject = doParallel(_reject);
      async.rejectSeries = doSeries(_reject);

      var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
          iterator(x, function (result) {
            if (result) {
              main_callback(x);
              main_callback = function () {};
            }
            else {
              callback();
            }
          });
        }, function (err) {
          main_callback();
        });
      };
      async.detect = doParallel(_detect);
      async.detectSeries = doSeries(_detect);

      async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
          iterator(x, function (v) {
            if (v) {
              main_callback(true);
              main_callback = function () {};
            }
            callback();
          });
        }, function (err) {
          main_callback(false);
        });
      };
      // any alias
      async.any = async.some;

      async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
          iterator(x, function (v) {
            if (!v) {
              main_callback(false);
              main_callback = function () {};
            }
            callback();
          });
        }, function (err) {
          main_callback(true);
        });
      };
      // all alias
      async.all = async.every;

      async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
          iterator(x, function (err, criteria) {
            if (err) {
              callback(err);
            }
            else {
              callback(null, {value: x, criteria: criteria});
            }
          });
        }, function (err, results) {
          if (err) {
            return callback(err);
          }
          else {
            var fn = function (left, right) {
              var a = left.criteria, b = right.criteria;
              return a < b ? -1 : a > b ? 1 : 0;
            };
            callback(null, _map(results.sort(fn), function (x) {
              return x.value;
            }));
          }
        });
      };

      async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
          return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
          listeners.unshift(fn);
        };
        var removeListener = function (fn) {
          for (var i = 0; i < listeners.length; i += 1) {
            if (listeners[i] === fn) {
              listeners.splice(i, 1);
              return;
            }
          }
        };
        var taskComplete = function () {
          _each(listeners.slice(0), function (fn) {
            fn();
          });
        };

        addListener(function () {
          if (_keys(results).length === keys.length) {
            callback(null, results);
            callback = function () {};
          }
        });

        _each(keys, function (k) {
          var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
          var taskCallback = function (err) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (args.length <= 1) {
              args = args[0];
            }
            if (err) {
              var safeResults = {};
              _each(_keys(results), function(rkey) {
                safeResults[rkey] = results[rkey];
              });
              safeResults[k] = args;
              callback(err, safeResults);
              // stop subsequent errors hitting callback multiple times
              callback = function () {};
            }
            else {
              results[k] = args;
              async.setImmediate(taskComplete);
            }
          };
          var requires = task.slice(0, Math.abs(task.length - 1)) || [];
          var ready = function () {
            return _reduce(requires, function (a, x) {
                return (a && results.hasOwnProperty(x));
              }, true) && !results.hasOwnProperty(k);
          };
          if (ready()) {
            task[task.length - 1](taskCallback, results);
          }
          else {
            var listener = function () {
              if (ready()) {
                removeListener(listener);
                task[task.length - 1](taskCallback, results);
              }
            };
            addListener(listener);
          }
        });
      };

      async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
          return callback();
        }
        var wrapIterator = function (iterator) {
          return function (err) {
            if (err) {
              callback.apply(null, arguments);
              callback = function () {};
            }
            else {
              var args = Array.prototype.slice.call(arguments, 1);
              var next = iterator.next();
              if (next) {
                args.push(wrapIterator(next));
              }
              else {
                args.push(callback);
              }
              async.setImmediate(function () {
                iterator.apply(null, args);
              });
            }
          };
        };
        wrapIterator(async.iterator(tasks))();
      };

      var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
          eachfn.map(tasks, function (fn, callback) {
            if (fn) {
              fn(function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                  args = args[0];
                }
                callback.call(null, err, args);
              });
            }
          }, callback);
        }
        else {
          var results = {};
          eachfn.each(_keys(tasks), function (k, callback) {
            tasks[k](function (err) {
              var args = Array.prototype.slice.call(arguments, 1);
              if (args.length <= 1) {
                args = args[0];
              }
              results[k] = args;
              callback(err);
            });
          }, function (err) {
            callback(err, results);
          });
        }
      };

      async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
      };

      async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
      };

      async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
          async.mapSeries(tasks, function (fn, callback) {
            if (fn) {
              fn(function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                  args = args[0];
                }
                callback.call(null, err, args);
              });
            }
          }, callback);
        }
        else {
          var results = {};
          async.eachSeries(_keys(tasks), function (k, callback) {
            tasks[k](function (err) {
              var args = Array.prototype.slice.call(arguments, 1);
              if (args.length <= 1) {
                args = args[0];
              }
              results[k] = args;
              callback(err);
            });
          }, function (err) {
            callback(err, results);
          });
        }
      };

      async.iterator = function (tasks) {
        var makeCallback = function (index) {
          var fn = function () {
            if (tasks.length) {
              tasks[index].apply(null, arguments);
            }
            return fn.next();
          };
          fn.next = function () {
            return (index < tasks.length - 1) ? makeCallback(index + 1): null;
          };
          return fn;
        };
        return makeCallback(0);
      };

      async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
          return fn.apply(
            null, args.concat(Array.prototype.slice.call(arguments))
          );
        };
      };

      var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
          fn(x, function (err, y) {
            r = r.concat(y || []);
            cb(err);
          });
        }, function (err) {
          callback(err, r);
        });
      };
      async.concat = doParallel(_concat);
      async.concatSeries = doSeries(_concat);

      async.whilst = function (test, iterator, callback) {
        if (test()) {
          iterator(function (err) {
            if (err) {
              return callback(err);
            }
            async.whilst(test, iterator, callback);
          });
        }
        else {
          callback();
        }
      };

      async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
          if (err) {
            return callback(err);
          }
          if (test()) {
            async.doWhilst(iterator, test, callback);
          }
          else {
            callback();
          }
        });
      };

      async.until = function (test, iterator, callback) {
        if (!test()) {
          iterator(function (err) {
            if (err) {
              return callback(err);
            }
            async.until(test, iterator, callback);
          });
        }
        else {
          callback();
        }
      };

      async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
          if (err) {
            return callback(err);
          }
          if (!test()) {
            async.doUntil(iterator, test, callback);
          }
          else {
            callback();
          }
        });
      };

      async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
          concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
            data = [data];
          }
          _each(data, function(task) {
            var item = {
              data: task,
              callback: typeof callback === 'function' ? callback : null
            };

            if (pos) {
              q.tasks.unshift(item);
            } else {
              q.tasks.push(item);
            }

            if (q.saturated && q.tasks.length === concurrency) {
              q.saturated();
            }
            async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
          tasks: [],
          concurrency: concurrency,
          saturated: null,
          empty: null,
          drain: null,
          push: function (data, callback) {
            _insert(q, data, false, callback);
          },
          unshift: function (data, callback) {
            _insert(q, data, true, callback);
          },
          process: function () {
            if (workers < q.concurrency && q.tasks.length) {
              var task = q.tasks.shift();
              if (q.empty && q.tasks.length === 0) {
                q.empty();
              }
              workers += 1;
              var next = function () {
                workers -= 1;
                if (task.callback) {
                  task.callback.apply(task, arguments);
                }
                if (q.drain && q.tasks.length + workers === 0) {
                  q.drain();
                }
                q.process();
              };
              var cb = only_once(next);
              worker(task.data, cb);
            }
          },
          length: function () {
            return q.tasks.length;
          },
          running: function () {
            return workers;
          }
        };
        return q;
      };

      async.cargo = function (worker, payload) {
        var working     = false,
          tasks       = [];

        var cargo = {
          tasks: tasks,
          payload: payload,
          saturated: null,
          empty: null,
          drain: null,
          push: function (data, callback) {
            if(data.constructor !== Array) {
              data = [data];
            }
            _each(data, function(task) {
              tasks.push({
                data: task,
                callback: typeof callback === 'function' ? callback : null
              });
              if (cargo.saturated && tasks.length === payload) {
                cargo.saturated();
              }
            });
            async.setImmediate(cargo.process);
          },
          process: function process() {
            if (working) return;
            if (tasks.length === 0) {
              if(cargo.drain) cargo.drain();
              return;
            }

            var ts = typeof payload === 'number'
              ? tasks.splice(0, payload)
              : tasks.splice(0);

            var ds = _map(ts, function (task) {
              return task.data;
            });

            if(cargo.empty) cargo.empty();
            working = true;
            worker(ds, function () {
              working = false;

              var args = arguments;
              _each(ts, function (data) {
                if (data.callback) {
                  data.callback.apply(null, args);
                }
              });

              process();
            });
          },
          length: function () {
            return tasks.length;
          },
          running: function () {
            return working;
          }
        };
        return cargo;
      };

      var _console_fn = function (name) {
        return function (fn) {
          var args = Array.prototype.slice.call(arguments, 1);
          fn.apply(null, args.concat([function (err) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (typeof console !== 'undefined') {
              if (err) {
                if (console.error) {
                  console.error(err);
                }
              }
              else if (console[name]) {
                _each(args, function (x) {
                  console[name](x);
                });
              }
            }
          }]));
        };
      };
      async.log = _console_fn('log');
      async.dir = _console_fn('dir');
      /*async.info = _console_fn('info');
       async.warn = _console_fn('warn');
       async.error = _console_fn('error');*/

      async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
          };
        var memoized = function () {
          var args = Array.prototype.slice.call(arguments);
          var callback = args.pop();
          var key = hasher.apply(null, args);
          if (key in memo) {
            callback.apply(null, memo[key]);
          }
          else if (key in queues) {
            queues[key].push(callback);
          }
          else {
            queues[key] = [callback];
            fn.apply(null, args.concat([function () {
              memo[key] = arguments;
              var q = queues[key];
              delete queues[key];
              for (var i = 0, l = q.length; i < l; i++) {
                q[i].apply(null, arguments);
              }
            }]));
          }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
      };

      async.unmemoize = function (fn) {
        return function () {
          return (fn.unmemoized || fn).apply(null, arguments);
        };
      };

      async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
          counter.push(i);
        }
        return async.map(counter, iterator, callback);
      };

      async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
          counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
      };

      async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
          var that = this;
          var args = Array.prototype.slice.call(arguments);
          var callback = args.pop();
          async.reduce(fns, args, function (newargs, fn, cb) {
              fn.apply(that, newargs.concat([function () {
                var err = arguments[0];
                var nextargs = Array.prototype.slice.call(arguments, 1);
                cb(err, nextargs);
              }]))
            },
            function (err, results) {
              callback.apply(that, [err].concat(results));
            });
        };
      };

      var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
          var that = this;
          var args = Array.prototype.slice.call(arguments);
          var callback = args.pop();
          return eachfn(fns, function (fn, cb) {
              fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
          var args = Array.prototype.slice.call(arguments, 2);
          return go.apply(this, args);
        }
        else {
          return go;
        }
      };
      async.applyEach = doParallel(_applyEach);
      async.applyEachSeries = doSeries(_applyEach);

      async.forever = function (fn, callback) {
        function next(err) {
          if (err) {
            if (callback) {
              return callback(err);
            }
            throw err;
          }
          fn(next);
        }
        next();
      };

      // AMD / RequireJS
      if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
          return async;
        });
      }
      // Node.js
      else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
      }
      // included directly via <script> tag
      else {
        root.async = async;
      }

    }());

  }).call(this,require('_process'))
},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser
  var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

  var cachedSetTimeout;
  var cachedClearTimeout;

  function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
  }
  function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
  }
  (function () {
    try {
      if (typeof setTimeout === 'function') {
        cachedSetTimeout = setTimeout;
      } else {
        cachedSetTimeout = defaultSetTimout;
      }
    } catch (e) {
      cachedSetTimeout = defaultSetTimout;
    }
    try {
      if (typeof clearTimeout === 'function') {
        cachedClearTimeout = clearTimeout;
      } else {
        cachedClearTimeout = defaultClearTimeout;
      }
    } catch (e) {
      cachedClearTimeout = defaultClearTimeout;
    }
  } ())
  function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
      //normal enviroments in sane situations
      return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
      cachedSetTimeout = setTimeout;
      return setTimeout(fun, 0);
    }
    try {
      // when when somebody has screwed with setTimeout but no I.E. maddness
      return cachedSetTimeout(fun, 0);
    } catch(e){
      try {
        // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
        return cachedSetTimeout.call(null, fun, 0);
      } catch(e){
        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
        return cachedSetTimeout.call(this, fun, 0);
      }
    }


  }
  function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
      //normal enviroments in sane situations
      return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
      cachedClearTimeout = clearTimeout;
      return clearTimeout(marker);
    }
    try {
      // when when somebody has screwed with setTimeout but no I.E. maddness
      return cachedClearTimeout(marker);
    } catch (e){
      try {
        // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
        return cachedClearTimeout.call(null, marker);
      } catch (e){
        // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
        // Some versions of I.E. have different rules for clearTimeout vs setTimeout
        return cachedClearTimeout.call(this, marker);
      }
    }



  }
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;

  function cleanUpNextTick() {
    if (!draining || !currentQueue) {
      return;
    }
    draining = false;
    if (currentQueue.length) {
      queue = currentQueue.concat(queue);
    } else {
      queueIndex = -1;
    }
    if (queue.length) {
      drainQueue();
    }
  }

  function drainQueue() {
    if (draining) {
      return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
      currentQueue = queue;
      queue = [];
      while (++queueIndex < len) {
        if (currentQueue) {
          currentQueue[queueIndex].run();
        }
      }
      queueIndex = -1;
      len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
  }

  process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
      runTimeout(drainQueue);
    }
  };

// v8 likes predictible objects
  function Item(fun, array) {
    this.fun = fun;
    this.array = array;
  }
  Item.prototype.run = function () {
    this.fun.apply(null, this.array);
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = ''; // empty string to avoid regexp issues
  process.versions = {};

  function noop() {}

  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;

  process.binding = function (name) {
    throw new Error('process.binding is not supported');
  };

  process.cwd = function () { return '/' };
  process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
  };
  process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
//! moment.js
//! version : 2.14.1
//! authors : Tim Wood, Iskren Chernev, Moment.js contributors
//! license : MIT
//! momentjs.com

  ;(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
      typeof define === 'function' && define.amd ? define(factory) :
        global.moment = factory()
  }(this, function () { 'use strict';

    var hookCallback;

    function utils_hooks__hooks () {
      return hookCallback.apply(null, arguments);
    }

    // This is done to register the method called with moment()
    // without creating circular dependencies.
    function setHookCallback (callback) {
      hookCallback = callback;
    }

    function isArray(input) {
      return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
    }

    function isObject(input) {
      return Object.prototype.toString.call(input) === '[object Object]';
    }

    function isObjectEmpty(obj) {
      var k;
      for (k in obj) {
        // even if its not own property I'd still call it non-empty
        return false;
      }
      return true;
    }

    function isDate(input) {
      return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
    }

    function map(arr, fn) {
      var res = [], i;
      for (i = 0; i < arr.length; ++i) {
        res.push(fn(arr[i], i));
      }
      return res;
    }

    function hasOwnProp(a, b) {
      return Object.prototype.hasOwnProperty.call(a, b);
    }

    function extend(a, b) {
      for (var i in b) {
        if (hasOwnProp(b, i)) {
          a[i] = b[i];
        }
      }

      if (hasOwnProp(b, 'toString')) {
        a.toString = b.toString;
      }

      if (hasOwnProp(b, 'valueOf')) {
        a.valueOf = b.valueOf;
      }

      return a;
    }

    function create_utc__createUTC (input, format, locale, strict) {
      return createLocalOrUTC(input, format, locale, strict, true).utc();
    }

    function defaultParsingFlags() {
      // We need to deep clone this object.
      return {
        empty           : false,
        unusedTokens    : [],
        unusedInput     : [],
        overflow        : -2,
        charsLeftOver   : 0,
        nullInput       : false,
        invalidMonth    : null,
        invalidFormat   : false,
        userInvalidated : false,
        iso             : false,
        parsedDateParts : [],
        meridiem        : null
      };
    }

    function getParsingFlags(m) {
      if (m._pf == null) {
        m._pf = defaultParsingFlags();
      }
      return m._pf;
    }

    var some;
    if (Array.prototype.some) {
      some = Array.prototype.some;
    } else {
      some = function (fun) {
        var t = Object(this);
        var len = t.length >>> 0;

        for (var i = 0; i < len; i++) {
          if (i in t && fun.call(this, t[i], i, t)) {
            return true;
          }
        }

        return false;
      };
    }

    function valid__isValid(m) {
      if (m._isValid == null) {
        var flags = getParsingFlags(m);
        var parsedParts = some.call(flags.parsedDateParts, function (i) {
          return i != null;
        });
        m._isValid = !isNaN(m._d.getTime()) &&
          flags.overflow < 0 &&
          !flags.empty &&
          !flags.invalidMonth &&
          !flags.invalidWeekday &&
          !flags.nullInput &&
          !flags.invalidFormat &&
          !flags.userInvalidated &&
          (!flags.meridiem || (flags.meridiem && parsedParts));

        if (m._strict) {
          m._isValid = m._isValid &&
            flags.charsLeftOver === 0 &&
            flags.unusedTokens.length === 0 &&
            flags.bigHour === undefined;
        }
      }
      return m._isValid;
    }

    function valid__createInvalid (flags) {
      var m = create_utc__createUTC(NaN);
      if (flags != null) {
        extend(getParsingFlags(m), flags);
      }
      else {
        getParsingFlags(m).userInvalidated = true;
      }

      return m;
    }

    function isUndefined(input) {
      return input === void 0;
    }

    // Plugins that add properties should also add the key here (null value),
    // so we can properly clone ourselves.
    var momentProperties = utils_hooks__hooks.momentProperties = [];

    function copyConfig(to, from) {
      var i, prop, val;

      if (!isUndefined(from._isAMomentObject)) {
        to._isAMomentObject = from._isAMomentObject;
      }
      if (!isUndefined(from._i)) {
        to._i = from._i;
      }
      if (!isUndefined(from._f)) {
        to._f = from._f;
      }
      if (!isUndefined(from._l)) {
        to._l = from._l;
      }
      if (!isUndefined(from._strict)) {
        to._strict = from._strict;
      }
      if (!isUndefined(from._tzm)) {
        to._tzm = from._tzm;
      }
      if (!isUndefined(from._isUTC)) {
        to._isUTC = from._isUTC;
      }
      if (!isUndefined(from._offset)) {
        to._offset = from._offset;
      }
      if (!isUndefined(from._pf)) {
        to._pf = getParsingFlags(from);
      }
      if (!isUndefined(from._locale)) {
        to._locale = from._locale;
      }

      if (momentProperties.length > 0) {
        for (i in momentProperties) {
          prop = momentProperties[i];
          val = from[prop];
          if (!isUndefined(val)) {
            to[prop] = val;
          }
        }
      }

      return to;
    }

    var updateInProgress = false;

    // Moment prototype object
    function Moment(config) {
      copyConfig(this, config);
      this._d = new Date(config._d != null ? config._d.getTime() : NaN);
      // Prevent infinite loop in case updateOffset creates new moment
      // objects.
      if (updateInProgress === false) {
        updateInProgress = true;
        utils_hooks__hooks.updateOffset(this);
        updateInProgress = false;
      }
    }

    function isMoment (obj) {
      return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
    }

    function absFloor (number) {
      if (number < 0) {
        // -0 -> 0
        return Math.ceil(number) || 0;
      } else {
        return Math.floor(number);
      }
    }

    function toInt(argumentForCoercion) {
      var coercedNumber = +argumentForCoercion,
        value = 0;

      if (coercedNumber !== 0 && isFinite(coercedNumber)) {
        value = absFloor(coercedNumber);
      }

      return value;
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2, dontConvert) {
      var len = Math.min(array1.length, array2.length),
        lengthDiff = Math.abs(array1.length - array2.length),
        diffs = 0,
        i;
      for (i = 0; i < len; i++) {
        if ((dontConvert && array1[i] !== array2[i]) ||
          (!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
          diffs++;
        }
      }
      return diffs + lengthDiff;
    }

    function warn(msg) {
      if (utils_hooks__hooks.suppressDeprecationWarnings === false &&
        (typeof console !==  'undefined') && console.warn) {
        console.warn('Deprecation warning: ' + msg);
      }
    }

    function deprecate(msg, fn) {
      var firstTime = true;

      return extend(function () {
        if (utils_hooks__hooks.deprecationHandler != null) {
          utils_hooks__hooks.deprecationHandler(null, msg);
        }
        if (firstTime) {
          warn(msg + '\nArguments: ' + Array.prototype.slice.call(arguments).join(', ') + '\n' + (new Error()).stack);
          firstTime = false;
        }
        return fn.apply(this, arguments);
      }, fn);
    }

    var deprecations = {};

    function deprecateSimple(name, msg) {
      if (utils_hooks__hooks.deprecationHandler != null) {
        utils_hooks__hooks.deprecationHandler(name, msg);
      }
      if (!deprecations[name]) {
        warn(msg);
        deprecations[name] = true;
      }
    }

    utils_hooks__hooks.suppressDeprecationWarnings = false;
    utils_hooks__hooks.deprecationHandler = null;

    function isFunction(input) {
      return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
    }

    function locale_set__set (config) {
      var prop, i;
      for (i in config) {
        prop = config[i];
        if (isFunction(prop)) {
          this[i] = prop;
        } else {
          this['_' + i] = prop;
        }
      }
      this._config = config;
      // Lenient ordinal parsing accepts just a number in addition to
      // number + (possibly) stuff coming from _ordinalParseLenient.
      this._ordinalParseLenient = new RegExp(this._ordinalParse.source + '|' + (/\d{1,2}/).source);
    }

    function mergeConfigs(parentConfig, childConfig) {
      var res = extend({}, parentConfig), prop;
      for (prop in childConfig) {
        if (hasOwnProp(childConfig, prop)) {
          if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
            res[prop] = {};
            extend(res[prop], parentConfig[prop]);
            extend(res[prop], childConfig[prop]);
          } else if (childConfig[prop] != null) {
            res[prop] = childConfig[prop];
          } else {
            delete res[prop];
          }
        }
      }
      for (prop in parentConfig) {
        if (hasOwnProp(parentConfig, prop) &&
          !hasOwnProp(childConfig, prop) &&
          isObject(parentConfig[prop])) {
          // make sure changes to properties don't modify parent config
          res[prop] = extend({}, res[prop]);
        }
      }
      return res;
    }

    function Locale(config) {
      if (config != null) {
        this.set(config);
      }
    }

    var keys;

    if (Object.keys) {
      keys = Object.keys;
    } else {
      keys = function (obj) {
        var i, res = [];
        for (i in obj) {
          if (hasOwnProp(obj, i)) {
            res.push(i);
          }
        }
        return res;
      };
    }

    var defaultCalendar = {
      sameDay : '[Today at] LT',
      nextDay : '[Tomorrow at] LT',
      nextWeek : 'dddd [at] LT',
      lastDay : '[Yesterday at] LT',
      lastWeek : '[Last] dddd [at] LT',
      sameElse : 'L'
    };

    function locale_calendar__calendar (key, mom, now) {
      var output = this._calendar[key] || this._calendar['sameElse'];
      return isFunction(output) ? output.call(mom, now) : output;
    }

    var defaultLongDateFormat = {
      LTS  : 'h:mm:ss A',
      LT   : 'h:mm A',
      L    : 'MM/DD/YYYY',
      LL   : 'MMMM D, YYYY',
      LLL  : 'MMMM D, YYYY h:mm A',
      LLLL : 'dddd, MMMM D, YYYY h:mm A'
    };

    function longDateFormat (key) {
      var format = this._longDateFormat[key],
        formatUpper = this._longDateFormat[key.toUpperCase()];

      if (format || !formatUpper) {
        return format;
      }

      this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
        return val.slice(1);
      });

      return this._longDateFormat[key];
    }

    var defaultInvalidDate = 'Invalid date';

    function invalidDate () {
      return this._invalidDate;
    }

    var defaultOrdinal = '%d';
    var defaultOrdinalParse = /\d{1,2}/;

    function ordinal (number) {
      return this._ordinal.replace('%d', number);
    }

    var defaultRelativeTime = {
      future : 'in %s',
      past   : '%s ago',
      s  : 'a few seconds',
      m  : 'a minute',
      mm : '%d minutes',
      h  : 'an hour',
      hh : '%d hours',
      d  : 'a day',
      dd : '%d days',
      M  : 'a month',
      MM : '%d months',
      y  : 'a year',
      yy : '%d years'
    };

    function relative__relativeTime (number, withoutSuffix, string, isFuture) {
      var output = this._relativeTime[string];
      return (isFunction(output)) ?
        output(number, withoutSuffix, string, isFuture) :
        output.replace(/%d/i, number);
    }

    function pastFuture (diff, output) {
      var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
      return isFunction(format) ? format(output) : format.replace(/%s/i, output);
    }

    var aliases = {};

    function addUnitAlias (unit, shorthand) {
      var lowerCase = unit.toLowerCase();
      aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
    }

    function normalizeUnits(units) {
      return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
    }

    function normalizeObjectUnits(inputObject) {
      var normalizedInput = {},
        normalizedProp,
        prop;

      for (prop in inputObject) {
        if (hasOwnProp(inputObject, prop)) {
          normalizedProp = normalizeUnits(prop);
          if (normalizedProp) {
            normalizedInput[normalizedProp] = inputObject[prop];
          }
        }
      }

      return normalizedInput;
    }

    var priorities = {};

    function addUnitPriority(unit, priority) {
      priorities[unit] = priority;
    }

    function getPrioritizedUnits(unitsObj) {
      var units = [];
      for (var u in unitsObj) {
        units.push({unit: u, priority: priorities[u]});
      }
      units.sort(function (a, b) {
        return a.priority - b.priority;
      });
      return units;
    }

    function makeGetSet (unit, keepTime) {
      return function (value) {
        if (value != null) {
          get_set__set(this, unit, value);
          utils_hooks__hooks.updateOffset(this, keepTime);
          return this;
        } else {
          return get_set__get(this, unit);
        }
      };
    }

    function get_set__get (mom, unit) {
      return mom.isValid() ?
        mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
    }

    function get_set__set (mom, unit, value) {
      if (mom.isValid()) {
        mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
      }
    }

    // MOMENTS

    function stringGet (units) {
      units = normalizeUnits(units);
      if (isFunction(this[units])) {
        return this[units]();
      }
      return this;
    }


    function stringSet (units, value) {
      if (typeof units === 'object') {
        units = normalizeObjectUnits(units);
        var prioritized = getPrioritizedUnits(units);
        for (var i = 0; i < prioritized.length; i++) {
          this[prioritized[i].unit](units[prioritized[i].unit]);
        }
      } else {
        units = normalizeUnits(units);
        if (isFunction(this[units])) {
          return this[units](value);
        }
      }
      return this;
    }

    function zeroFill(number, targetLength, forceSign) {
      var absNumber = '' + Math.abs(number),
        zerosToFill = targetLength - absNumber.length,
        sign = number >= 0;
      return (sign ? (forceSign ? '+' : '') : '-') +
        Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
    }

    var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

    var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

    var formatFunctions = {};

    var formatTokenFunctions = {};

    // token:    'M'
    // padded:   ['MM', 2]
    // ordinal:  'Mo'
    // callback: function () { this.month() + 1 }
    function addFormatToken (token, padded, ordinal, callback) {
      var func = callback;
      if (typeof callback === 'string') {
        func = function () {
          return this[callback]();
        };
      }
      if (token) {
        formatTokenFunctions[token] = func;
      }
      if (padded) {
        formatTokenFunctions[padded[0]] = function () {
          return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
        };
      }
      if (ordinal) {
        formatTokenFunctions[ordinal] = function () {
          return this.localeData().ordinal(func.apply(this, arguments), token);
        };
      }
    }

    function removeFormattingTokens(input) {
      if (input.match(/\[[\s\S]/)) {
        return input.replace(/^\[|\]$/g, '');
      }
      return input.replace(/\\/g, '');
    }

    function makeFormatFunction(format) {
      var array = format.match(formattingTokens), i, length;

      for (i = 0, length = array.length; i < length; i++) {
        if (formatTokenFunctions[array[i]]) {
          array[i] = formatTokenFunctions[array[i]];
        } else {
          array[i] = removeFormattingTokens(array[i]);
        }
      }

      return function (mom) {
        var output = '', i;
        for (i = 0; i < length; i++) {
          output += array[i] instanceof Function ? array[i].call(mom, format) : array[i];
        }
        return output;
      };
    }

    // format date using native date object
    function formatMoment(m, format) {
      if (!m.isValid()) {
        return m.localeData().invalidDate();
      }

      format = expandFormat(format, m.localeData());
      formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

      return formatFunctions[format](m);
    }

    function expandFormat(format, locale) {
      var i = 5;

      function replaceLongDateFormatTokens(input) {
        return locale.longDateFormat(input) || input;
      }

      localFormattingTokens.lastIndex = 0;
      while (i >= 0 && localFormattingTokens.test(format)) {
        format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
        localFormattingTokens.lastIndex = 0;
        i -= 1;
      }

      return format;
    }

    var match1         = /\d/;            //       0 - 9
    var match2         = /\d\d/;          //      00 - 99
    var match3         = /\d{3}/;         //     000 - 999
    var match4         = /\d{4}/;         //    0000 - 9999
    var match6         = /[+-]?\d{6}/;    // -999999 - 999999
    var match1to2      = /\d\d?/;         //       0 - 99
    var match3to4      = /\d\d\d\d?/;     //     999 - 9999
    var match5to6      = /\d\d\d\d\d\d?/; //   99999 - 999999
    var match1to3      = /\d{1,3}/;       //       0 - 999
    var match1to4      = /\d{1,4}/;       //       0 - 9999
    var match1to6      = /[+-]?\d{1,6}/;  // -999999 - 999999

    var matchUnsigned  = /\d+/;           //       0 - inf
    var matchSigned    = /[+-]?\d+/;      //    -inf - inf

    var matchOffset    = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
    var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

    var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

    // any word (or two) characters or numbers including two/three word month in arabic.
    // includes scottish gaelic two word and hyphenated months
    var matchWord = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;


    var regexes = {};

    function addRegexToken (token, regex, strictRegex) {
      regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
        return (isStrict && strictRegex) ? strictRegex : regex;
      };
    }

    function getParseRegexForToken (token, config) {
      if (!hasOwnProp(regexes, token)) {
        return new RegExp(unescapeFormat(token));
      }

      return regexes[token](config._strict, config._locale);
    }

    // Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
    function unescapeFormat(s) {
      return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
        return p1 || p2 || p3 || p4;
      }));
    }

    function regexEscape(s) {
      return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    var tokens = {};

    function addParseToken (token, callback) {
      var i, func = callback;
      if (typeof token === 'string') {
        token = [token];
      }
      if (typeof callback === 'number') {
        func = function (input, array) {
          array[callback] = toInt(input);
        };
      }
      for (i = 0; i < token.length; i++) {
        tokens[token[i]] = func;
      }
    }

    function addWeekParseToken (token, callback) {
      addParseToken(token, function (input, array, config, token) {
        config._w = config._w || {};
        callback(input, config._w, config, token);
      });
    }

    function addTimeToArrayFromToken(token, input, config) {
      if (input != null && hasOwnProp(tokens, token)) {
        tokens[token](input, config._a, config, token);
      }
    }

    var YEAR = 0;
    var MONTH = 1;
    var DATE = 2;
    var HOUR = 3;
    var MINUTE = 4;
    var SECOND = 5;
    var MILLISECOND = 6;
    var WEEK = 7;
    var WEEKDAY = 8;

    var indexOf;

    if (Array.prototype.indexOf) {
      indexOf = Array.prototype.indexOf;
    } else {
      indexOf = function (o) {
        // I know
        var i;
        for (i = 0; i < this.length; ++i) {
          if (this[i] === o) {
            return i;
          }
        }
        return -1;
      };
    }

    function daysInMonth(year, month) {
      return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    }

    // FORMATTING

    addFormatToken('M', ['MM', 2], 'Mo', function () {
      return this.month() + 1;
    });

    addFormatToken('MMM', 0, 0, function (format) {
      return this.localeData().monthsShort(this, format);
    });

    addFormatToken('MMMM', 0, 0, function (format) {
      return this.localeData().months(this, format);
    });

    // ALIASES

    addUnitAlias('month', 'M');

    // PRIORITY

    addUnitPriority('month', 8);

    // PARSING

    addRegexToken('M',    match1to2);
    addRegexToken('MM',   match1to2, match2);
    addRegexToken('MMM',  function (isStrict, locale) {
      return locale.monthsShortRegex(isStrict);
    });
    addRegexToken('MMMM', function (isStrict, locale) {
      return locale.monthsRegex(isStrict);
    });

    addParseToken(['M', 'MM'], function (input, array) {
      array[MONTH] = toInt(input) - 1;
    });

    addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
      var month = config._locale.monthsParse(input, token, config._strict);
      // if we didn't find a month name, mark the date as invalid.
      if (month != null) {
        array[MONTH] = month;
      } else {
        getParsingFlags(config).invalidMonth = input;
      }
    });

    // LOCALES

    var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s+)+MMMM?/;
    var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
    function localeMonths (m, format) {
      return isArray(this._months) ? this._months[m.month()] :
        this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
    }

    var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
    function localeMonthsShort (m, format) {
      return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
        this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
    }

    function units_month__handleStrictParse(monthName, format, strict) {
      var i, ii, mom, llc = monthName.toLocaleLowerCase();
      if (!this._monthsParse) {
        // this is not used
        this._monthsParse = [];
        this._longMonthsParse = [];
        this._shortMonthsParse = [];
        for (i = 0; i < 12; ++i) {
          mom = create_utc__createUTC([2000, i]);
          this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
          this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
        }
      }

      if (strict) {
        if (format === 'MMM') {
          ii = indexOf.call(this._shortMonthsParse, llc);
          return ii !== -1 ? ii : null;
        } else {
          ii = indexOf.call(this._longMonthsParse, llc);
          return ii !== -1 ? ii : null;
        }
      } else {
        if (format === 'MMM') {
          ii = indexOf.call(this._shortMonthsParse, llc);
          if (ii !== -1) {
            return ii;
          }
          ii = indexOf.call(this._longMonthsParse, llc);
          return ii !== -1 ? ii : null;
        } else {
          ii = indexOf.call(this._longMonthsParse, llc);
          if (ii !== -1) {
            return ii;
          }
          ii = indexOf.call(this._shortMonthsParse, llc);
          return ii !== -1 ? ii : null;
        }
      }
    }

    function localeMonthsParse (monthName, format, strict) {
      var i, mom, regex;

      if (this._monthsParseExact) {
        return units_month__handleStrictParse.call(this, monthName, format, strict);
      }

      if (!this._monthsParse) {
        this._monthsParse = [];
        this._longMonthsParse = [];
        this._shortMonthsParse = [];
      }

      // TODO: add sorting
      // Sorting makes sure if one month (or abbr) is a prefix of another
      // see sorting in computeMonthsParse
      for (i = 0; i < 12; i++) {
        // make the regex if we don't have it already
        mom = create_utc__createUTC([2000, i]);
        if (strict && !this._longMonthsParse[i]) {
          this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
          this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
        }
        if (!strict && !this._monthsParse[i]) {
          regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
          this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
        }
        // test the regex
        if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
          return i;
        } else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
          return i;
        } else if (!strict && this._monthsParse[i].test(monthName)) {
          return i;
        }
      }
    }

    // MOMENTS

    function setMonth (mom, value) {
      var dayOfMonth;

      if (!mom.isValid()) {
        // No op
        return mom;
      }

      if (typeof value === 'string') {
        if (/^\d+$/.test(value)) {
          value = toInt(value);
        } else {
          value = mom.localeData().monthsParse(value);
          // TODO: Another silent failure?
          if (typeof value !== 'number') {
            return mom;
          }
        }
      }

      dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
      mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
      return mom;
    }

    function getSetMonth (value) {
      if (value != null) {
        setMonth(this, value);
        utils_hooks__hooks.updateOffset(this, true);
        return this;
      } else {
        return get_set__get(this, 'Month');
      }
    }

    function getDaysInMonth () {
      return daysInMonth(this.year(), this.month());
    }

    var defaultMonthsShortRegex = matchWord;
    function monthsShortRegex (isStrict) {
      if (this._monthsParseExact) {
        if (!hasOwnProp(this, '_monthsRegex')) {
          computeMonthsParse.call(this);
        }
        if (isStrict) {
          return this._monthsShortStrictRegex;
        } else {
          return this._monthsShortRegex;
        }
      } else {
        if (!hasOwnProp(this, '_monthsShortRegex')) {
          this._monthsShortRegex = defaultMonthsShortRegex;
        }
        return this._monthsShortStrictRegex && isStrict ?
          this._monthsShortStrictRegex : this._monthsShortRegex;
      }
    }

    var defaultMonthsRegex = matchWord;
    function monthsRegex (isStrict) {
      if (this._monthsParseExact) {
        if (!hasOwnProp(this, '_monthsRegex')) {
          computeMonthsParse.call(this);
        }
        if (isStrict) {
          return this._monthsStrictRegex;
        } else {
          return this._monthsRegex;
        }
      } else {
        if (!hasOwnProp(this, '_monthsRegex')) {
          this._monthsRegex = defaultMonthsRegex;
        }
        return this._monthsStrictRegex && isStrict ?
          this._monthsStrictRegex : this._monthsRegex;
      }
    }

    function computeMonthsParse () {
      function cmpLenRev(a, b) {
        return b.length - a.length;
      }

      var shortPieces = [], longPieces = [], mixedPieces = [],
        i, mom;
      for (i = 0; i < 12; i++) {
        // make the regex if we don't have it already
        mom = create_utc__createUTC([2000, i]);
        shortPieces.push(this.monthsShort(mom, ''));
        longPieces.push(this.months(mom, ''));
        mixedPieces.push(this.months(mom, ''));
        mixedPieces.push(this.monthsShort(mom, ''));
      }
      // Sorting makes sure if one month (or abbr) is a prefix of another it
      // will match the longer piece.
      shortPieces.sort(cmpLenRev);
      longPieces.sort(cmpLenRev);
      mixedPieces.sort(cmpLenRev);
      for (i = 0; i < 12; i++) {
        shortPieces[i] = regexEscape(shortPieces[i]);
        longPieces[i] = regexEscape(longPieces[i]);
      }
      for (i = 0; i < 24; i++) {
        mixedPieces[i] = regexEscape(mixedPieces[i]);
      }

      this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
      this._monthsShortRegex = this._monthsRegex;
      this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
      this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
    }

    // FORMATTING

    addFormatToken('Y', 0, 0, function () {
      var y = this.year();
      return y <= 9999 ? '' + y : '+' + y;
    });

    addFormatToken(0, ['YY', 2], 0, function () {
      return this.year() % 100;
    });

    addFormatToken(0, ['YYYY',   4],       0, 'year');
    addFormatToken(0, ['YYYYY',  5],       0, 'year');
    addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

    // ALIASES

    addUnitAlias('year', 'y');

    // PRIORITIES

    addUnitPriority('year', 1);

    // PARSING

    addRegexToken('Y',      matchSigned);
    addRegexToken('YY',     match1to2, match2);
    addRegexToken('YYYY',   match1to4, match4);
    addRegexToken('YYYYY',  match1to6, match6);
    addRegexToken('YYYYYY', match1to6, match6);

    addParseToken(['YYYYY', 'YYYYYY'], YEAR);
    addParseToken('YYYY', function (input, array) {
      array[YEAR] = input.length === 2 ? utils_hooks__hooks.parseTwoDigitYear(input) : toInt(input);
    });
    addParseToken('YY', function (input, array) {
      array[YEAR] = utils_hooks__hooks.parseTwoDigitYear(input);
    });
    addParseToken('Y', function (input, array) {
      array[YEAR] = parseInt(input, 10);
    });

    // HELPERS

    function daysInYear(year) {
      return isLeapYear(year) ? 366 : 365;
    }

    function isLeapYear(year) {
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    // HOOKS

    utils_hooks__hooks.parseTwoDigitYear = function (input) {
      return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
    };

    // MOMENTS

    var getSetYear = makeGetSet('FullYear', true);

    function getIsLeapYear () {
      return isLeapYear(this.year());
    }

    function createDate (y, m, d, h, M, s, ms) {
      //can't just apply() to create a date:
      //http://stackoverflow.com/questions/181348/instantiating-a-javascript-object-by-calling-prototype-constructor-apply
      var date = new Date(y, m, d, h, M, s, ms);

      //the date constructor remaps years 0-99 to 1900-1999
      if (y < 100 && y >= 0 && isFinite(date.getFullYear())) {
        date.setFullYear(y);
      }
      return date;
    }

    function createUTCDate (y) {
      var date = new Date(Date.UTC.apply(null, arguments));

      //the Date.UTC function remaps years 0-99 to 1900-1999
      if (y < 100 && y >= 0 && isFinite(date.getUTCFullYear())) {
        date.setUTCFullYear(y);
      }
      return date;
    }

    // start-of-first-week - start-of-year
    function firstWeekOffset(year, dow, doy) {
      var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
        fwd = 7 + dow - doy,
      // first-week day local weekday -- which local weekday is fwd
        fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

      return -fwdlw + fwd - 1;
    }

    //http://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
    function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
      var localWeekday = (7 + weekday - dow) % 7,
        weekOffset = firstWeekOffset(year, dow, doy),
        dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
        resYear, resDayOfYear;

      if (dayOfYear <= 0) {
        resYear = year - 1;
        resDayOfYear = daysInYear(resYear) + dayOfYear;
      } else if (dayOfYear > daysInYear(year)) {
        resYear = year + 1;
        resDayOfYear = dayOfYear - daysInYear(year);
      } else {
        resYear = year;
        resDayOfYear = dayOfYear;
      }

      return {
        year: resYear,
        dayOfYear: resDayOfYear
      };
    }

    function weekOfYear(mom, dow, doy) {
      var weekOffset = firstWeekOffset(mom.year(), dow, doy),
        week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
        resWeek, resYear;

      if (week < 1) {
        resYear = mom.year() - 1;
        resWeek = week + weeksInYear(resYear, dow, doy);
      } else if (week > weeksInYear(mom.year(), dow, doy)) {
        resWeek = week - weeksInYear(mom.year(), dow, doy);
        resYear = mom.year() + 1;
      } else {
        resYear = mom.year();
        resWeek = week;
      }

      return {
        week: resWeek,
        year: resYear
      };
    }

    function weeksInYear(year, dow, doy) {
      var weekOffset = firstWeekOffset(year, dow, doy),
        weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
      return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
    }

    // FORMATTING

    addFormatToken('w', ['ww', 2], 'wo', 'week');
    addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

    // ALIASES

    addUnitAlias('week', 'w');
    addUnitAlias('isoWeek', 'W');

    // PRIORITIES

    addUnitPriority('week', 5);
    addUnitPriority('isoWeek', 5);

    // PARSING

    addRegexToken('w',  match1to2);
    addRegexToken('ww', match1to2, match2);
    addRegexToken('W',  match1to2);
    addRegexToken('WW', match1to2, match2);

    addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
      week[token.substr(0, 1)] = toInt(input);
    });

    // HELPERS

    // LOCALES

    function localeWeek (mom) {
      return weekOfYear(mom, this._week.dow, this._week.doy).week;
    }

    var defaultLocaleWeek = {
      dow : 0, // Sunday is the first day of the week.
      doy : 6  // The week that contains Jan 1st is the first week of the year.
    };

    function localeFirstDayOfWeek () {
      return this._week.dow;
    }

    function localeFirstDayOfYear () {
      return this._week.doy;
    }

    // MOMENTS

    function getSetWeek (input) {
      var week = this.localeData().week(this);
      return input == null ? week : this.add((input - week) * 7, 'd');
    }

    function getSetISOWeek (input) {
      var week = weekOfYear(this, 1, 4).week;
      return input == null ? week : this.add((input - week) * 7, 'd');
    }

    // FORMATTING

    addFormatToken('d', 0, 'do', 'day');

    addFormatToken('dd', 0, 0, function (format) {
      return this.localeData().weekdaysMin(this, format);
    });

    addFormatToken('ddd', 0, 0, function (format) {
      return this.localeData().weekdaysShort(this, format);
    });

    addFormatToken('dddd', 0, 0, function (format) {
      return this.localeData().weekdays(this, format);
    });

    addFormatToken('e', 0, 0, 'weekday');
    addFormatToken('E', 0, 0, 'isoWeekday');

    // ALIASES

    addUnitAlias('day', 'd');
    addUnitAlias('weekday', 'e');
    addUnitAlias('isoWeekday', 'E');

    // PRIORITY
    addUnitPriority('day', 11);
    addUnitPriority('weekday', 11);
    addUnitPriority('isoWeekday', 11);

    // PARSING

    addRegexToken('d',    match1to2);
    addRegexToken('e',    match1to2);
    addRegexToken('E',    match1to2);
    addRegexToken('dd',   function (isStrict, locale) {
      return locale.weekdaysMinRegex(isStrict);
    });
    addRegexToken('ddd',   function (isStrict, locale) {
      return locale.weekdaysShortRegex(isStrict);
    });
    addRegexToken('dddd',   function (isStrict, locale) {
      return locale.weekdaysRegex(isStrict);
    });

    addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
      var weekday = config._locale.weekdaysParse(input, token, config._strict);
      // if we didn't get a weekday name, mark the date as invalid
      if (weekday != null) {
        week.d = weekday;
      } else {
        getParsingFlags(config).invalidWeekday = input;
      }
    });

    addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
      week[token] = toInt(input);
    });

    // HELPERS

    function parseWeekday(input, locale) {
      if (typeof input !== 'string') {
        return input;
      }

      if (!isNaN(input)) {
        return parseInt(input, 10);
      }

      input = locale.weekdaysParse(input);
      if (typeof input === 'number') {
        return input;
      }

      return null;
    }

    function parseIsoWeekday(input, locale) {
      if (typeof input === 'string') {
        return locale.weekdaysParse(input) % 7 || 7;
      }
      return isNaN(input) ? null : input;
    }

    // LOCALES

    var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
    function localeWeekdays (m, format) {
      return isArray(this._weekdays) ? this._weekdays[m.day()] :
        this._weekdays[this._weekdays.isFormat.test(format) ? 'format' : 'standalone'][m.day()];
    }

    var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
    function localeWeekdaysShort (m) {
      return this._weekdaysShort[m.day()];
    }

    var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
    function localeWeekdaysMin (m) {
      return this._weekdaysMin[m.day()];
    }

    function day_of_week__handleStrictParse(weekdayName, format, strict) {
      var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
      if (!this._weekdaysParse) {
        this._weekdaysParse = [];
        this._shortWeekdaysParse = [];
        this._minWeekdaysParse = [];

        for (i = 0; i < 7; ++i) {
          mom = create_utc__createUTC([2000, 1]).day(i);
          this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
          this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
          this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
        }
      }

      if (strict) {
        if (format === 'dddd') {
          ii = indexOf.call(this._weekdaysParse, llc);
          return ii !== -1 ? ii : null;
        } else if (format === 'ddd') {
          ii = indexOf.call(this._shortWeekdaysParse, llc);
          return ii !== -1 ? ii : null;
        } else {
          ii = indexOf.call(this._minWeekdaysParse, llc);
          return ii !== -1 ? ii : null;
        }
      } else {
        if (format === 'dddd') {
          ii = indexOf.call(this._weekdaysParse, llc);
          if (ii !== -1) {
            return ii;
          }
          ii = indexOf.call(this._shortWeekdaysParse, llc);
          if (ii !== -1) {
            return ii;
          }
          ii = indexOf.call(this._minWeekdaysParse, llc);
          return ii !== -1 ? ii : null;
        } else if (format === 'ddd') {
          ii = indexOf.call(this._shortWeekdaysParse, llc);
          if (ii !== -1) {
            return ii;
          }
          ii = indexOf.call(this._weekdaysParse, llc);
          if (ii !== -1) {
            return ii;
          }
          ii = indexOf.call(this._minWeekdaysParse, llc);
          return ii !== -1 ? ii : null;
        } else {
          ii = indexOf.call(this._minWeekdaysParse, llc);
          if (ii !== -1) {
            return ii;
          }
          ii = indexOf.call(this._weekdaysParse, llc);
          if (ii !== -1) {
            return ii;
          }
          ii = indexOf.call(this._shortWeekdaysParse, llc);
          return ii !== -1 ? ii : null;
        }
      }
    }

    function localeWeekdaysParse (weekdayName, format, strict) {
      var i, mom, regex;

      if (this._weekdaysParseExact) {
        return day_of_week__handleStrictParse.call(this, weekdayName, format, strict);
      }

      if (!this._weekdaysParse) {
        this._weekdaysParse = [];
        this._minWeekdaysParse = [];
        this._shortWeekdaysParse = [];
        this._fullWeekdaysParse = [];
      }

      for (i = 0; i < 7; i++) {
        // make the regex if we don't have it already

        mom = create_utc__createUTC([2000, 1]).day(i);
        if (strict && !this._fullWeekdaysParse[i]) {
          this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\.?') + '$', 'i');
          this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\.?') + '$', 'i');
          this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\.?') + '$', 'i');
        }
        if (!this._weekdaysParse[i]) {
          regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
          this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
        }
        // test the regex
        if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
          return i;
        } else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
          return i;
        } else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
          return i;
        } else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
          return i;
        }
      }
    }

    // MOMENTS

    function getSetDayOfWeek (input) {
      if (!this.isValid()) {
        return input != null ? this : NaN;
      }
      var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
      if (input != null) {
        input = parseWeekday(input, this.localeData());
        return this.add(input - day, 'd');
      } else {
        return day;
      }
    }

    function getSetLocaleDayOfWeek (input) {
      if (!this.isValid()) {
        return input != null ? this : NaN;
      }
      var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
      return input == null ? weekday : this.add(input - weekday, 'd');
    }

    function getSetISODayOfWeek (input) {
      if (!this.isValid()) {
        return input != null ? this : NaN;
      }

      // behaves the same as moment#day except
      // as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
      // as a setter, sunday should belong to the previous week.

      if (input != null) {
        var weekday = parseIsoWeekday(input, this.localeData());
        return this.day(this.day() % 7 ? weekday : weekday - 7);
      } else {
        return this.day() || 7;
      }
    }

    var defaultWeekdaysRegex = matchWord;
    function weekdaysRegex (isStrict) {
      if (this._weekdaysParseExact) {
        if (!hasOwnProp(this, '_weekdaysRegex')) {
          computeWeekdaysParse.call(this);
        }
        if (isStrict) {
          return this._weekdaysStrictRegex;
        } else {
          return this._weekdaysRegex;
        }
      } else {
        if (!hasOwnProp(this, '_weekdaysRegex')) {
          this._weekdaysRegex = defaultWeekdaysRegex;
        }
        return this._weekdaysStrictRegex && isStrict ?
          this._weekdaysStrictRegex : this._weekdaysRegex;
      }
    }

    var defaultWeekdaysShortRegex = matchWord;
    function weekdaysShortRegex (isStrict) {
      if (this._weekdaysParseExact) {
        if (!hasOwnProp(this, '_weekdaysRegex')) {
          computeWeekdaysParse.call(this);
        }
        if (isStrict) {
          return this._weekdaysShortStrictRegex;
        } else {
          return this._weekdaysShortRegex;
        }
      } else {
        if (!hasOwnProp(this, '_weekdaysShortRegex')) {
          this._weekdaysShortRegex = defaultWeekdaysShortRegex;
        }
        return this._weekdaysShortStrictRegex && isStrict ?
          this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
      }
    }

    var defaultWeekdaysMinRegex = matchWord;
    function weekdaysMinRegex (isStrict) {
      if (this._weekdaysParseExact) {
        if (!hasOwnProp(this, '_weekdaysRegex')) {
          computeWeekdaysParse.call(this);
        }
        if (isStrict) {
          return this._weekdaysMinStrictRegex;
        } else {
          return this._weekdaysMinRegex;
        }
      } else {
        if (!hasOwnProp(this, '_weekdaysMinRegex')) {
          this._weekdaysMinRegex = defaultWeekdaysMinRegex;
        }
        return this._weekdaysMinStrictRegex && isStrict ?
          this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
      }
    }


    function computeWeekdaysParse () {
      function cmpLenRev(a, b) {
        return b.length - a.length;
      }

      var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
        i, mom, minp, shortp, longp;
      for (i = 0; i < 7; i++) {
        // make the regex if we don't have it already
        mom = create_utc__createUTC([2000, 1]).day(i);
        minp = this.weekdaysMin(mom, '');
        shortp = this.weekdaysShort(mom, '');
        longp = this.weekdays(mom, '');
        minPieces.push(minp);
        shortPieces.push(shortp);
        longPieces.push(longp);
        mixedPieces.push(minp);
        mixedPieces.push(shortp);
        mixedPieces.push(longp);
      }
      // Sorting makes sure if one weekday (or abbr) is a prefix of another it
      // will match the longer piece.
      minPieces.sort(cmpLenRev);
      shortPieces.sort(cmpLenRev);
      longPieces.sort(cmpLenRev);
      mixedPieces.sort(cmpLenRev);
      for (i = 0; i < 7; i++) {
        shortPieces[i] = regexEscape(shortPieces[i]);
        longPieces[i] = regexEscape(longPieces[i]);
        mixedPieces[i] = regexEscape(mixedPieces[i]);
      }

      this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
      this._weekdaysShortRegex = this._weekdaysRegex;
      this._weekdaysMinRegex = this._weekdaysRegex;

      this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
      this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
      this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
    }

    // FORMATTING

    function hFormat() {
      return this.hours() % 12 || 12;
    }

    function kFormat() {
      return this.hours() || 24;
    }

    addFormatToken('H', ['HH', 2], 0, 'hour');
    addFormatToken('h', ['hh', 2], 0, hFormat);
    addFormatToken('k', ['kk', 2], 0, kFormat);

    addFormatToken('hmm', 0, 0, function () {
      return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
    });

    addFormatToken('hmmss', 0, 0, function () {
      return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
        zeroFill(this.seconds(), 2);
    });

    addFormatToken('Hmm', 0, 0, function () {
      return '' + this.hours() + zeroFill(this.minutes(), 2);
    });

    addFormatToken('Hmmss', 0, 0, function () {
      return '' + this.hours() + zeroFill(this.minutes(), 2) +
        zeroFill(this.seconds(), 2);
    });

    function meridiem (token, lowercase) {
      addFormatToken(token, 0, 0, function () {
        return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
      });
    }

    meridiem('a', true);
    meridiem('A', false);

    // ALIASES

    addUnitAlias('hour', 'h');

    // PRIORITY
    addUnitPriority('hour', 13);

    // PARSING

    function matchMeridiem (isStrict, locale) {
      return locale._meridiemParse;
    }

    addRegexToken('a',  matchMeridiem);
    addRegexToken('A',  matchMeridiem);
    addRegexToken('H',  match1to2);
    addRegexToken('h',  match1to2);
    addRegexToken('HH', match1to2, match2);
    addRegexToken('hh', match1to2, match2);

    addRegexToken('hmm', match3to4);
    addRegexToken('hmmss', match5to6);
    addRegexToken('Hmm', match3to4);
    addRegexToken('Hmmss', match5to6);

    addParseToken(['H', 'HH'], HOUR);
    addParseToken(['a', 'A'], function (input, array, config) {
      config._isPm = config._locale.isPM(input);
      config._meridiem = input;
    });
    addParseToken(['h', 'hh'], function (input, array, config) {
      array[HOUR] = toInt(input);
      getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmm', function (input, array, config) {
      var pos = input.length - 2;
      array[HOUR] = toInt(input.substr(0, pos));
      array[MINUTE] = toInt(input.substr(pos));
      getParsingFlags(config).bigHour = true;
    });
    addParseToken('hmmss', function (input, array, config) {
      var pos1 = input.length - 4;
      var pos2 = input.length - 2;
      array[HOUR] = toInt(input.substr(0, pos1));
      array[MINUTE] = toInt(input.substr(pos1, 2));
      array[SECOND] = toInt(input.substr(pos2));
      getParsingFlags(config).bigHour = true;
    });
    addParseToken('Hmm', function (input, array, config) {
      var pos = input.length - 2;
      array[HOUR] = toInt(input.substr(0, pos));
      array[MINUTE] = toInt(input.substr(pos));
    });
    addParseToken('Hmmss', function (input, array, config) {
      var pos1 = input.length - 4;
      var pos2 = input.length - 2;
      array[HOUR] = toInt(input.substr(0, pos1));
      array[MINUTE] = toInt(input.substr(pos1, 2));
      array[SECOND] = toInt(input.substr(pos2));
    });

    // LOCALES

    function localeIsPM (input) {
      // IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
      // Using charAt should be more compatible.
      return ((input + '').toLowerCase().charAt(0) === 'p');
    }

    var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
    function localeMeridiem (hours, minutes, isLower) {
      if (hours > 11) {
        return isLower ? 'pm' : 'PM';
      } else {
        return isLower ? 'am' : 'AM';
      }
    }


    // MOMENTS

    // Setting the hour should keep the time, because the user explicitly
    // specified which hour he wants. So trying to maintain the same hour (in
    // a new timezone) makes sense. Adding/subtracting hours does not follow
    // this rule.
    var getSetHour = makeGetSet('Hours', true);

    var baseConfig = {
      calendar: defaultCalendar,
      longDateFormat: defaultLongDateFormat,
      invalidDate: defaultInvalidDate,
      ordinal: defaultOrdinal,
      ordinalParse: defaultOrdinalParse,
      relativeTime: defaultRelativeTime,

      months: defaultLocaleMonths,
      monthsShort: defaultLocaleMonthsShort,

      week: defaultLocaleWeek,

      weekdays: defaultLocaleWeekdays,
      weekdaysMin: defaultLocaleWeekdaysMin,
      weekdaysShort: defaultLocaleWeekdaysShort,

      meridiemParse: defaultLocaleMeridiemParse
    };

    // internal storage for locale config files
    var locales = {};
    var globalLocale;

    function normalizeLocale(key) {
      return key ? key.toLowerCase().replace('_', '-') : key;
    }

    // pick the locale from the array
    // try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
    // substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
    function chooseLocale(names) {
      var i = 0, j, next, locale, split;

      while (i < names.length) {
        split = normalizeLocale(names[i]).split('-');
        j = split.length;
        next = normalizeLocale(names[i + 1]);
        next = next ? next.split('-') : null;
        while (j > 0) {
          locale = loadLocale(split.slice(0, j).join('-'));
          if (locale) {
            return locale;
          }
          if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
            //the next array item is better than a shallower substring of this one
            break;
          }
          j--;
        }
        i++;
      }
      return null;
    }

    function loadLocale(name) {
      var oldLocale = null;
      // TODO: Find a better way to register and load all the locales in Node
      if (!locales[name] && (typeof module !== 'undefined') &&
        module && module.exports) {
        try {
          oldLocale = globalLocale._abbr;
          require('./locale/' + name);
          // because defineLocale currently also sets the global locale, we
          // want to undo that for lazy loaded locales
          locale_locales__getSetGlobalLocale(oldLocale);
        } catch (e) { }
      }
      return locales[name];
    }

    // This function will load locale and then set the global locale.  If
    // no arguments are passed in, it will simply return the current global
    // locale key.
    function locale_locales__getSetGlobalLocale (key, values) {
      var data;
      if (key) {
        if (isUndefined(values)) {
          data = locale_locales__getLocale(key);
        }
        else {
          data = defineLocale(key, values);
        }

        if (data) {
          // moment.duration._locale = moment._locale = data;
          globalLocale = data;
        }
      }

      return globalLocale._abbr;
    }

    function defineLocale (name, config) {
      if (config !== null) {
        var parentConfig = baseConfig;
        config.abbr = name;
        if (locales[name] != null) {
          deprecateSimple('defineLocaleOverride',
            'use moment.updateLocale(localeName, config) to change ' +
            'an existing locale. moment.defineLocale(localeName, ' +
            'config) should only be used for creating a new locale ' +
            'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
          parentConfig = locales[name]._config;
        } else if (config.parentLocale != null) {
          if (locales[config.parentLocale] != null) {
            parentConfig = locales[config.parentLocale]._config;
          } else {
            // treat as if there is no base config
            deprecateSimple('parentLocaleUndefined',
              'specified parentLocale is not defined yet. See http://momentjs.com/guides/#/warnings/parent-locale/');
          }
        }
        locales[name] = new Locale(mergeConfigs(parentConfig, config));

        // backwards compat for now: also set the locale
        locale_locales__getSetGlobalLocale(name);

        return locales[name];
      } else {
        // useful for testing
        delete locales[name];
        return null;
      }
    }

    function updateLocale(name, config) {
      if (config != null) {
        var locale, parentConfig = baseConfig;
        // MERGE
        if (locales[name] != null) {
          parentConfig = locales[name]._config;
        }
        config = mergeConfigs(parentConfig, config);
        locale = new Locale(config);
        locale.parentLocale = locales[name];
        locales[name] = locale;

        // backwards compat for now: also set the locale
        locale_locales__getSetGlobalLocale(name);
      } else {
        // pass null for config to unupdate, useful for tests
        if (locales[name] != null) {
          if (locales[name].parentLocale != null) {
            locales[name] = locales[name].parentLocale;
          } else if (locales[name] != null) {
            delete locales[name];
          }
        }
      }
      return locales[name];
    }

    // returns locale data
    function locale_locales__getLocale (key) {
      var locale;

      if (key && key._locale && key._locale._abbr) {
        key = key._locale._abbr;
      }

      if (!key) {
        return globalLocale;
      }

      if (!isArray(key)) {
        //short-circuit everything else
        locale = loadLocale(key);
        if (locale) {
          return locale;
        }
        key = [key];
      }

      return chooseLocale(key);
    }

    function locale_locales__listLocales() {
      return keys(locales);
    }

    function checkOverflow (m) {
      var overflow;
      var a = m._a;

      if (a && getParsingFlags(m).overflow === -2) {
        overflow =
          a[MONTH]       < 0 || a[MONTH]       > 11  ? MONTH :
            a[DATE]        < 1 || a[DATE]        > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
              a[HOUR]        < 0 || a[HOUR]        > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
                a[MINUTE]      < 0 || a[MINUTE]      > 59  ? MINUTE :
                  a[SECOND]      < 0 || a[SECOND]      > 59  ? SECOND :
                    a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
                      -1;

        if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
          overflow = DATE;
        }
        if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
          overflow = WEEK;
        }
        if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
          overflow = WEEKDAY;
        }

        getParsingFlags(m).overflow = overflow;
      }

      return m;
    }

    // iso 8601 regex
    // 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
    var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?/;
    var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?/;

    var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

    var isoDates = [
      ['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
      ['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
      ['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
      ['GGGG-[W]WW', /\d{4}-W\d\d/, false],
      ['YYYY-DDD', /\d{4}-\d{3}/],
      ['YYYY-MM', /\d{4}-\d\d/, false],
      ['YYYYYYMMDD', /[+-]\d{10}/],
      ['YYYYMMDD', /\d{8}/],
      // YYYYMM is NOT allowed by the standard
      ['GGGG[W]WWE', /\d{4}W\d{3}/],
      ['GGGG[W]WW', /\d{4}W\d{2}/, false],
      ['YYYYDDD', /\d{7}/]
    ];

    // iso time formats and regexes
    var isoTimes = [
      ['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
      ['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
      ['HH:mm:ss', /\d\d:\d\d:\d\d/],
      ['HH:mm', /\d\d:\d\d/],
      ['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
      ['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
      ['HHmmss', /\d\d\d\d\d\d/],
      ['HHmm', /\d\d\d\d/],
      ['HH', /\d\d/]
    ];

    var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

    // date from iso format
    function configFromISO(config) {
      var i, l,
        string = config._i,
        match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
        allowTime, dateFormat, timeFormat, tzFormat;

      if (match) {
        getParsingFlags(config).iso = true;

        for (i = 0, l = isoDates.length; i < l; i++) {
          if (isoDates[i][1].exec(match[1])) {
            dateFormat = isoDates[i][0];
            allowTime = isoDates[i][2] !== false;
            break;
          }
        }
        if (dateFormat == null) {
          config._isValid = false;
          return;
        }
        if (match[3]) {
          for (i = 0, l = isoTimes.length; i < l; i++) {
            if (isoTimes[i][1].exec(match[3])) {
              // match[2] should be 'T' or space
              timeFormat = (match[2] || ' ') + isoTimes[i][0];
              break;
            }
          }
          if (timeFormat == null) {
            config._isValid = false;
            return;
          }
        }
        if (!allowTime && timeFormat != null) {
          config._isValid = false;
          return;
        }
        if (match[4]) {
          if (tzRegex.exec(match[4])) {
            tzFormat = 'Z';
          } else {
            config._isValid = false;
            return;
          }
        }
        config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
        configFromStringAndFormat(config);
      } else {
        config._isValid = false;
      }
    }

    // date from iso format or fallback
    function configFromString(config) {
      var matched = aspNetJsonRegex.exec(config._i);

      if (matched !== null) {
        config._d = new Date(+matched[1]);
        return;
      }

      configFromISO(config);
      if (config._isValid === false) {
        delete config._isValid;
        utils_hooks__hooks.createFromInputFallback(config);
      }
    }

    utils_hooks__hooks.createFromInputFallback = deprecate(
      'moment construction falls back to js Date. This is ' +
      'discouraged and will be removed in upcoming major ' +
      'release. Please refer to ' +
      'http://momentjs.com/guides/#/warnings/js-date/ for more info.',
      function (config) {
        config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
      }
    );

    // Pick the first defined of two or three arguments.
    function defaults(a, b, c) {
      if (a != null) {
        return a;
      }
      if (b != null) {
        return b;
      }
      return c;
    }

    function currentDateArray(config) {
      // hooks is actually the exported moment object
      var nowValue = new Date(utils_hooks__hooks.now());
      if (config._useUTC) {
        return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
      }
      return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function configFromArray (config) {
      var i, date, input = [], currentDate, yearToUse;

      if (config._d) {
        return;
      }

      currentDate = currentDateArray(config);

      //compute day of the year from weeks and weekdays
      if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
        dayOfYearFromWeekInfo(config);
      }

      //if the day of the year is set, figure out what it is
      if (config._dayOfYear) {
        yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

        if (config._dayOfYear > daysInYear(yearToUse)) {
          getParsingFlags(config)._overflowDayOfYear = true;
        }

        date = createUTCDate(yearToUse, 0, config._dayOfYear);
        config._a[MONTH] = date.getUTCMonth();
        config._a[DATE] = date.getUTCDate();
      }

      // Default to current date.
      // * if no year, month, day of month are given, default to today
      // * if day of month is given, default month and year
      // * if month is given, default only year
      // * if year is given, don't default anything
      for (i = 0; i < 3 && config._a[i] == null; ++i) {
        config._a[i] = input[i] = currentDate[i];
      }

      // Zero out whatever was not defaulted, including time
      for (; i < 7; i++) {
        config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
      }

      // Check for 24:00:00.000
      if (config._a[HOUR] === 24 &&
        config._a[MINUTE] === 0 &&
        config._a[SECOND] === 0 &&
        config._a[MILLISECOND] === 0) {
        config._nextDay = true;
        config._a[HOUR] = 0;
      }

      config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
      // Apply timezone offset from input. The actual utcOffset can be changed
      // with parseZone.
      if (config._tzm != null) {
        config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
      }

      if (config._nextDay) {
        config._a[HOUR] = 24;
      }
    }

    function dayOfYearFromWeekInfo(config) {
      var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

      w = config._w;
      if (w.GG != null || w.W != null || w.E != null) {
        dow = 1;
        doy = 4;

        // TODO: We need to take the current isoWeekYear, but that depends on
        // how we interpret now (local, utc, fixed offset). So create
        // a now version of current config (take local/utc/offset flags, and
        // create now).
        weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(local__createLocal(), 1, 4).year);
        week = defaults(w.W, 1);
        weekday = defaults(w.E, 1);
        if (weekday < 1 || weekday > 7) {
          weekdayOverflow = true;
        }
      } else {
        dow = config._locale._week.dow;
        doy = config._locale._week.doy;

        weekYear = defaults(w.gg, config._a[YEAR], weekOfYear(local__createLocal(), dow, doy).year);
        week = defaults(w.w, 1);

        if (w.d != null) {
          // weekday -- low day numbers are considered next week
          weekday = w.d;
          if (weekday < 0 || weekday > 6) {
            weekdayOverflow = true;
          }
        } else if (w.e != null) {
          // local weekday -- counting starts from begining of week
          weekday = w.e + dow;
          if (w.e < 0 || w.e > 6) {
            weekdayOverflow = true;
          }
        } else {
          // default to begining of week
          weekday = dow;
        }
      }
      if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
        getParsingFlags(config)._overflowWeeks = true;
      } else if (weekdayOverflow != null) {
        getParsingFlags(config)._overflowWeekday = true;
      } else {
        temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
        config._a[YEAR] = temp.year;
        config._dayOfYear = temp.dayOfYear;
      }
    }

    // constant that refers to the ISO standard
    utils_hooks__hooks.ISO_8601 = function () {};

    // date from string and format string
    function configFromStringAndFormat(config) {
      // TODO: Move this to another part of the creation flow to prevent circular deps
      if (config._f === utils_hooks__hooks.ISO_8601) {
        configFromISO(config);
        return;
      }

      config._a = [];
      getParsingFlags(config).empty = true;

      // This array is used to make a Date, either with `new Date` or `Date.UTC`
      var string = '' + config._i,
        i, parsedInput, tokens, token, skipped,
        stringLength = string.length,
        totalParsedInputLength = 0;

      tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

      for (i = 0; i < tokens.length; i++) {
        token = tokens[i];
        parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
        // console.log('token', token, 'parsedInput', parsedInput,
        //         'regex', getParseRegexForToken(token, config));
        if (parsedInput) {
          skipped = string.substr(0, string.indexOf(parsedInput));
          if (skipped.length > 0) {
            getParsingFlags(config).unusedInput.push(skipped);
          }
          string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
          totalParsedInputLength += parsedInput.length;
        }
        // don't parse if it's not a known token
        if (formatTokenFunctions[token]) {
          if (parsedInput) {
            getParsingFlags(config).empty = false;
          }
          else {
            getParsingFlags(config).unusedTokens.push(token);
          }
          addTimeToArrayFromToken(token, parsedInput, config);
        }
        else if (config._strict && !parsedInput) {
          getParsingFlags(config).unusedTokens.push(token);
        }
      }

      // add remaining unparsed input length to the string
      getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
      if (string.length > 0) {
        getParsingFlags(config).unusedInput.push(string);
      }

      // clear _12h flag if hour is <= 12
      if (config._a[HOUR] <= 12 &&
        getParsingFlags(config).bigHour === true &&
        config._a[HOUR] > 0) {
        getParsingFlags(config).bigHour = undefined;
      }

      getParsingFlags(config).parsedDateParts = config._a.slice(0);
      getParsingFlags(config).meridiem = config._meridiem;
      // handle meridiem
      config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

      configFromArray(config);
      checkOverflow(config);
    }


    function meridiemFixWrap (locale, hour, meridiem) {
      var isPm;

      if (meridiem == null) {
        // nothing to do
        return hour;
      }
      if (locale.meridiemHour != null) {
        return locale.meridiemHour(hour, meridiem);
      } else if (locale.isPM != null) {
        // Fallback
        isPm = locale.isPM(meridiem);
        if (isPm && hour < 12) {
          hour += 12;
        }
        if (!isPm && hour === 12) {
          hour = 0;
        }
        return hour;
      } else {
        // this is not supposed to happen
        return hour;
      }
    }

    // date from string and array of format strings
    function configFromStringAndArray(config) {
      var tempConfig,
        bestMoment,

        scoreToBeat,
        i,
        currentScore;

      if (config._f.length === 0) {
        getParsingFlags(config).invalidFormat = true;
        config._d = new Date(NaN);
        return;
      }

      for (i = 0; i < config._f.length; i++) {
        currentScore = 0;
        tempConfig = copyConfig({}, config);
        if (config._useUTC != null) {
          tempConfig._useUTC = config._useUTC;
        }
        tempConfig._f = config._f[i];
        configFromStringAndFormat(tempConfig);

        if (!valid__isValid(tempConfig)) {
          continue;
        }

        // if there is any input that was not parsed add a penalty for that format
        currentScore += getParsingFlags(tempConfig).charsLeftOver;

        //or tokens
        currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

        getParsingFlags(tempConfig).score = currentScore;

        if (scoreToBeat == null || currentScore < scoreToBeat) {
          scoreToBeat = currentScore;
          bestMoment = tempConfig;
        }
      }

      extend(config, bestMoment || tempConfig);
    }

    function configFromObject(config) {
      if (config._d) {
        return;
      }

      var i = normalizeObjectUnits(config._i);
      config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
        return obj && parseInt(obj, 10);
      });

      configFromArray(config);
    }

    function createFromConfig (config) {
      var res = new Moment(checkOverflow(prepareConfig(config)));
      if (res._nextDay) {
        // Adding is smart enough around DST
        res.add(1, 'd');
        res._nextDay = undefined;
      }

      return res;
    }

    function prepareConfig (config) {
      var input = config._i,
        format = config._f;

      config._locale = config._locale || locale_locales__getLocale(config._l);

      if (input === null || (format === undefined && input === '')) {
        return valid__createInvalid({nullInput: true});
      }

      if (typeof input === 'string') {
        config._i = input = config._locale.preparse(input);
      }

      if (isMoment(input)) {
        return new Moment(checkOverflow(input));
      } else if (isArray(format)) {
        configFromStringAndArray(config);
      } else if (isDate(input)) {
        config._d = input;
      } else if (format) {
        configFromStringAndFormat(config);
      }  else {
        configFromInput(config);
      }

      if (!valid__isValid(config)) {
        config._d = null;
      }

      return config;
    }

    function configFromInput(config) {
      var input = config._i;
      if (input === undefined) {
        config._d = new Date(utils_hooks__hooks.now());
      } else if (isDate(input)) {
        config._d = new Date(input.valueOf());
      } else if (typeof input === 'string') {
        configFromString(config);
      } else if (isArray(input)) {
        config._a = map(input.slice(0), function (obj) {
          return parseInt(obj, 10);
        });
        configFromArray(config);
      } else if (typeof(input) === 'object') {
        configFromObject(config);
      } else if (typeof(input) === 'number') {
        // from milliseconds
        config._d = new Date(input);
      } else {
        utils_hooks__hooks.createFromInputFallback(config);
      }
    }

    function createLocalOrUTC (input, format, locale, strict, isUTC) {
      var c = {};

      if (typeof(locale) === 'boolean') {
        strict = locale;
        locale = undefined;
      }

      if ((isObject(input) && isObjectEmpty(input)) ||
        (isArray(input) && input.length === 0)) {
        input = undefined;
      }
      // object construction must be done this way.
      // https://github.com/moment/moment/issues/1423
      c._isAMomentObject = true;
      c._useUTC = c._isUTC = isUTC;
      c._l = locale;
      c._i = input;
      c._f = format;
      c._strict = strict;

      return createFromConfig(c);
    }

    function local__createLocal (input, format, locale, strict) {
      return createLocalOrUTC(input, format, locale, strict, false);
    }

    var prototypeMin = deprecate(
      'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
      function () {
        var other = local__createLocal.apply(null, arguments);
        if (this.isValid() && other.isValid()) {
          return other < this ? this : other;
        } else {
          return valid__createInvalid();
        }
      }
    );

    var prototypeMax = deprecate(
      'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
      function () {
        var other = local__createLocal.apply(null, arguments);
        if (this.isValid() && other.isValid()) {
          return other > this ? this : other;
        } else {
          return valid__createInvalid();
        }
      }
    );

    // Pick a moment m from moments so that m[fn](other) is true for all
    // other. This relies on the function fn to be transitive.
    //
    // moments should either be an array of moment objects or an array, whose
    // first element is an array of moment objects.
    function pickBy(fn, moments) {
      var res, i;
      if (moments.length === 1 && isArray(moments[0])) {
        moments = moments[0];
      }
      if (!moments.length) {
        return local__createLocal();
      }
      res = moments[0];
      for (i = 1; i < moments.length; ++i) {
        if (!moments[i].isValid() || moments[i][fn](res)) {
          res = moments[i];
        }
      }
      return res;
    }

    // TODO: Use [].sort instead?
    function min () {
      var args = [].slice.call(arguments, 0);

      return pickBy('isBefore', args);
    }

    function max () {
      var args = [].slice.call(arguments, 0);

      return pickBy('isAfter', args);
    }

    var now = function () {
      return Date.now ? Date.now() : +(new Date());
    };

    function Duration (duration) {
      var normalizedInput = normalizeObjectUnits(duration),
        years = normalizedInput.year || 0,
        quarters = normalizedInput.quarter || 0,
        months = normalizedInput.month || 0,
        weeks = normalizedInput.week || 0,
        days = normalizedInput.day || 0,
        hours = normalizedInput.hour || 0,
        minutes = normalizedInput.minute || 0,
        seconds = normalizedInput.second || 0,
        milliseconds = normalizedInput.millisecond || 0;

      // representation for dateAddRemove
      this._milliseconds = +milliseconds +
        seconds * 1e3 + // 1000
        minutes * 6e4 + // 1000 * 60
        hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
      // Because of dateAddRemove treats 24 hours as different from a
      // day when working around DST, we need to store them separately
      this._days = +days +
        weeks * 7;
      // It is impossible translate months into days without knowing
      // which months you are are talking about, so we have to store
      // it separately.
      this._months = +months +
        quarters * 3 +
        years * 12;

      this._data = {};

      this._locale = locale_locales__getLocale();

      this._bubble();
    }

    function isDuration (obj) {
      return obj instanceof Duration;
    }

    // FORMATTING

    function offset (token, separator) {
      addFormatToken(token, 0, 0, function () {
        var offset = this.utcOffset();
        var sign = '+';
        if (offset < 0) {
          offset = -offset;
          sign = '-';
        }
        return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
      });
    }

    offset('Z', ':');
    offset('ZZ', '');

    // PARSING

    addRegexToken('Z',  matchShortOffset);
    addRegexToken('ZZ', matchShortOffset);
    addParseToken(['Z', 'ZZ'], function (input, array, config) {
      config._useUTC = true;
      config._tzm = offsetFromString(matchShortOffset, input);
    });

    // HELPERS

    // timezone chunker
    // '+10:00' > ['10',  '00']
    // '-1530'  > ['-15', '30']
    var chunkOffset = /([\+\-]|\d\d)/gi;

    function offsetFromString(matcher, string) {
      var matches = ((string || '').match(matcher) || []);
      var chunk   = matches[matches.length - 1] || [];
      var parts   = (chunk + '').match(chunkOffset) || ['-', 0, 0];
      var minutes = +(parts[1] * 60) + toInt(parts[2]);

      return parts[0] === '+' ? minutes : -minutes;
    }

    // Return a moment from input, that is local/utc/zone equivalent to model.
    function cloneWithOffset(input, model) {
      var res, diff;
      if (model._isUTC) {
        res = model.clone();
        diff = (isMoment(input) || isDate(input) ? input.valueOf() : local__createLocal(input).valueOf()) - res.valueOf();
        // Use low-level api, because this fn is low-level api.
        res._d.setTime(res._d.valueOf() + diff);
        utils_hooks__hooks.updateOffset(res, false);
        return res;
      } else {
        return local__createLocal(input).local();
      }
    }

    function getDateOffset (m) {
      // On Firefox.24 Date#getTimezoneOffset returns a floating point.
      // https://github.com/moment/moment/pull/1871
      return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
    }

    // HOOKS

    // This function will be called whenever a moment is mutated.
    // It is intended to keep the offset in sync with the timezone.
    utils_hooks__hooks.updateOffset = function () {};

    // MOMENTS

    // keepLocalTime = true means only change the timezone, without
    // affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
    // 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
    // +0200, so we adjust the time as needed, to be valid.
    //
    // Keeping the time actually adds/subtracts (one hour)
    // from the actual represented time. That is why we call updateOffset
    // a second time. In case it wants us to change the offset again
    // _changeInProgress == true case, then we have to adjust, because
    // there is no such time in the given timezone.
    function getSetOffset (input, keepLocalTime) {
      var offset = this._offset || 0,
        localAdjust;
      if (!this.isValid()) {
        return input != null ? this : NaN;
      }
      if (input != null) {
        if (typeof input === 'string') {
          input = offsetFromString(matchShortOffset, input);
        } else if (Math.abs(input) < 16) {
          input = input * 60;
        }
        if (!this._isUTC && keepLocalTime) {
          localAdjust = getDateOffset(this);
        }
        this._offset = input;
        this._isUTC = true;
        if (localAdjust != null) {
          this.add(localAdjust, 'm');
        }
        if (offset !== input) {
          if (!keepLocalTime || this._changeInProgress) {
            add_subtract__addSubtract(this, create__createDuration(input - offset, 'm'), 1, false);
          } else if (!this._changeInProgress) {
            this._changeInProgress = true;
            utils_hooks__hooks.updateOffset(this, true);
            this._changeInProgress = null;
          }
        }
        return this;
      } else {
        return this._isUTC ? offset : getDateOffset(this);
      }
    }

    function getSetZone (input, keepLocalTime) {
      if (input != null) {
        if (typeof input !== 'string') {
          input = -input;
        }

        this.utcOffset(input, keepLocalTime);

        return this;
      } else {
        return -this.utcOffset();
      }
    }

    function setOffsetToUTC (keepLocalTime) {
      return this.utcOffset(0, keepLocalTime);
    }

    function setOffsetToLocal (keepLocalTime) {
      if (this._isUTC) {
        this.utcOffset(0, keepLocalTime);
        this._isUTC = false;

        if (keepLocalTime) {
          this.subtract(getDateOffset(this), 'm');
        }
      }
      return this;
    }

    function setOffsetToParsedOffset () {
      if (this._tzm) {
        this.utcOffset(this._tzm);
      } else if (typeof this._i === 'string') {
        this.utcOffset(offsetFromString(matchOffset, this._i));
      }
      return this;
    }

    function hasAlignedHourOffset (input) {
      if (!this.isValid()) {
        return false;
      }
      input = input ? local__createLocal(input).utcOffset() : 0;

      return (this.utcOffset() - input) % 60 === 0;
    }

    function isDaylightSavingTime () {
      return (
        this.utcOffset() > this.clone().month(0).utcOffset() ||
        this.utcOffset() > this.clone().month(5).utcOffset()
      );
    }

    function isDaylightSavingTimeShifted () {
      if (!isUndefined(this._isDSTShifted)) {
        return this._isDSTShifted;
      }

      var c = {};

      copyConfig(c, this);
      c = prepareConfig(c);

      if (c._a) {
        var other = c._isUTC ? create_utc__createUTC(c._a) : local__createLocal(c._a);
        this._isDSTShifted = this.isValid() &&
          compareArrays(c._a, other.toArray()) > 0;
      } else {
        this._isDSTShifted = false;
      }

      return this._isDSTShifted;
    }

    function isLocal () {
      return this.isValid() ? !this._isUTC : false;
    }

    function isUtcOffset () {
      return this.isValid() ? this._isUTC : false;
    }

    function isUtc () {
      return this.isValid() ? this._isUTC && this._offset === 0 : false;
    }

    // ASP.NET json date format regex
    var aspNetRegex = /^(\-)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)\.?(\d{3})?\d*)?$/;

    // from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
    // somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
    // and further modified to allow for strings containing both week and day
    var isoRegex = /^(-)?P(?:(-?[0-9,.]*)Y)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)W)?(?:(-?[0-9,.]*)D)?(?:T(?:(-?[0-9,.]*)H)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)S)?)?$/;

    function create__createDuration (input, key) {
      var duration = input,
      // matching against regexp is expensive, do it on demand
        match = null,
        sign,
        ret,
        diffRes;

      if (isDuration(input)) {
        duration = {
          ms : input._milliseconds,
          d  : input._days,
          M  : input._months
        };
      } else if (typeof input === 'number') {
        duration = {};
        if (key) {
          duration[key] = input;
        } else {
          duration.milliseconds = input;
        }
      } else if (!!(match = aspNetRegex.exec(input))) {
        sign = (match[1] === '-') ? -1 : 1;
        duration = {
          y  : 0,
          d  : toInt(match[DATE])        * sign,
          h  : toInt(match[HOUR])        * sign,
          m  : toInt(match[MINUTE])      * sign,
          s  : toInt(match[SECOND])      * sign,
          ms : toInt(match[MILLISECOND]) * sign
        };
      } else if (!!(match = isoRegex.exec(input))) {
        sign = (match[1] === '-') ? -1 : 1;
        duration = {
          y : parseIso(match[2], sign),
          M : parseIso(match[3], sign),
          w : parseIso(match[4], sign),
          d : parseIso(match[5], sign),
          h : parseIso(match[6], sign),
          m : parseIso(match[7], sign),
          s : parseIso(match[8], sign)
        };
      } else if (duration == null) {// checks for null or undefined
        duration = {};
      } else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
        diffRes = momentsDifference(local__createLocal(duration.from), local__createLocal(duration.to));

        duration = {};
        duration.ms = diffRes.milliseconds;
        duration.M = diffRes.months;
      }

      ret = new Duration(duration);

      if (isDuration(input) && hasOwnProp(input, '_locale')) {
        ret._locale = input._locale;
      }

      return ret;
    }

    create__createDuration.fn = Duration.prototype;

    function parseIso (inp, sign) {
      // We'd normally use ~~inp for this, but unfortunately it also
      // converts floats to ints.
      // inp may be undefined, so careful calling replace on it.
      var res = inp && parseFloat(inp.replace(',', '.'));
      // apply sign while we're at it
      return (isNaN(res) ? 0 : res) * sign;
    }

    function positiveMomentsDifference(base, other) {
      var res = {milliseconds: 0, months: 0};

      res.months = other.month() - base.month() +
        (other.year() - base.year()) * 12;
      if (base.clone().add(res.months, 'M').isAfter(other)) {
        --res.months;
      }

      res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

      return res;
    }

    function momentsDifference(base, other) {
      var res;
      if (!(base.isValid() && other.isValid())) {
        return {milliseconds: 0, months: 0};
      }

      other = cloneWithOffset(other, base);
      if (base.isBefore(other)) {
        res = positiveMomentsDifference(base, other);
      } else {
        res = positiveMomentsDifference(other, base);
        res.milliseconds = -res.milliseconds;
        res.months = -res.months;
      }

      return res;
    }

    function absRound (number) {
      if (number < 0) {
        return Math.round(-1 * number) * -1;
      } else {
        return Math.round(number);
      }
    }

    // TODO: remove 'name' arg after deprecation is removed
    function createAdder(direction, name) {
      return function (val, period) {
        var dur, tmp;
        //invert the arguments, but complain about it
        if (period !== null && !isNaN(+period)) {
          deprecateSimple(name, 'moment().' + name  + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' +
            'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
          tmp = val; val = period; period = tmp;
        }

        val = typeof val === 'string' ? +val : val;
        dur = create__createDuration(val, period);
        add_subtract__addSubtract(this, dur, direction);
        return this;
      };
    }

    function add_subtract__addSubtract (mom, duration, isAdding, updateOffset) {
      var milliseconds = duration._milliseconds,
        days = absRound(duration._days),
        months = absRound(duration._months);

      if (!mom.isValid()) {
        // No op
        return;
      }

      updateOffset = updateOffset == null ? true : updateOffset;

      if (milliseconds) {
        mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
      }
      if (days) {
        get_set__set(mom, 'Date', get_set__get(mom, 'Date') + days * isAdding);
      }
      if (months) {
        setMonth(mom, get_set__get(mom, 'Month') + months * isAdding);
      }
      if (updateOffset) {
        utils_hooks__hooks.updateOffset(mom, days || months);
      }
    }

    var add_subtract__add      = createAdder(1, 'add');
    var add_subtract__subtract = createAdder(-1, 'subtract');

    function getCalendarFormat(myMoment, now) {
      var diff = myMoment.diff(now, 'days', true);
      return diff < -6 ? 'sameElse' :
        diff < -1 ? 'lastWeek' :
          diff < 0 ? 'lastDay' :
            diff < 1 ? 'sameDay' :
              diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';
    }

    function moment_calendar__calendar (time, formats) {
      // We want to compare the start of today, vs this.
      // Getting start-of-today depends on whether we're local/utc/offset or not.
      var now = time || local__createLocal(),
        sod = cloneWithOffset(now, this).startOf('day'),
        format = utils_hooks__hooks.calendarFormat(this, sod) || 'sameElse';

      var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);

      return this.format(output || this.localeData().calendar(format, this, local__createLocal(now)));
    }

    function clone () {
      return new Moment(this);
    }

    function isAfter (input, units) {
      var localInput = isMoment(input) ? input : local__createLocal(input);
      if (!(this.isValid() && localInput.isValid())) {
        return false;
      }
      units = normalizeUnits(!isUndefined(units) ? units : 'millisecond');
      if (units === 'millisecond') {
        return this.valueOf() > localInput.valueOf();
      } else {
        return localInput.valueOf() < this.clone().startOf(units).valueOf();
      }
    }

    function isBefore (input, units) {
      var localInput = isMoment(input) ? input : local__createLocal(input);
      if (!(this.isValid() && localInput.isValid())) {
        return false;
      }
      units = normalizeUnits(!isUndefined(units) ? units : 'millisecond');
      if (units === 'millisecond') {
        return this.valueOf() < localInput.valueOf();
      } else {
        return this.clone().endOf(units).valueOf() < localInput.valueOf();
      }
    }

    function isBetween (from, to, units, inclusivity) {
      inclusivity = inclusivity || '()';
      return (inclusivity[0] === '(' ? this.isAfter(from, units) : !this.isBefore(from, units)) &&
        (inclusivity[1] === ')' ? this.isBefore(to, units) : !this.isAfter(to, units));
    }

    function isSame (input, units) {
      var localInput = isMoment(input) ? input : local__createLocal(input),
        inputMs;
      if (!(this.isValid() && localInput.isValid())) {
        return false;
      }
      units = normalizeUnits(units || 'millisecond');
      if (units === 'millisecond') {
        return this.valueOf() === localInput.valueOf();
      } else {
        inputMs = localInput.valueOf();
        return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
      }
    }

    function isSameOrAfter (input, units) {
      return this.isSame(input, units) || this.isAfter(input,units);
    }

    function isSameOrBefore (input, units) {
      return this.isSame(input, units) || this.isBefore(input,units);
    }

    function diff (input, units, asFloat) {
      var that,
        zoneDelta,
        delta, output;

      if (!this.isValid()) {
        return NaN;
      }

      that = cloneWithOffset(input, this);

      if (!that.isValid()) {
        return NaN;
      }

      zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

      units = normalizeUnits(units);

      if (units === 'year' || units === 'month' || units === 'quarter') {
        output = monthDiff(this, that);
        if (units === 'quarter') {
          output = output / 3;
        } else if (units === 'year') {
          output = output / 12;
        }
      } else {
        delta = this - that;
        output = units === 'second' ? delta / 1e3 : // 1000
          units === 'minute' ? delta / 6e4 : // 1000 * 60
            units === 'hour' ? delta / 36e5 : // 1000 * 60 * 60
              units === 'day' ? (delta - zoneDelta) / 864e5 : // 1000 * 60 * 60 * 24, negate dst
                units === 'week' ? (delta - zoneDelta) / 6048e5 : // 1000 * 60 * 60 * 24 * 7, negate dst
                  delta;
      }
      return asFloat ? output : absFloor(output);
    }

    function monthDiff (a, b) {
      // difference in months
      var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
      // b is in (anchor - 1 month, anchor + 1 month)
        anchor = a.clone().add(wholeMonthDiff, 'months'),
        anchor2, adjust;

      if (b - anchor < 0) {
        anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
        // linear across the month
        adjust = (b - anchor) / (anchor - anchor2);
      } else {
        anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
        // linear across the month
        adjust = (b - anchor) / (anchor2 - anchor);
      }

      //check for negative zero, return zero if negative zero
      return -(wholeMonthDiff + adjust) || 0;
    }

    utils_hooks__hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
    utils_hooks__hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

    function toString () {
      return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
    }

    function moment_format__toISOString () {
      var m = this.clone().utc();
      if (0 < m.year() && m.year() <= 9999) {
        if (isFunction(Date.prototype.toISOString)) {
          // native implementation is ~50x faster, use it when we can
          return this.toDate().toISOString();
        } else {
          return formatMoment(m, 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
        }
      } else {
        return formatMoment(m, 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
      }
    }

    function format (inputString) {
      if (!inputString) {
        inputString = this.isUtc() ? utils_hooks__hooks.defaultFormatUtc : utils_hooks__hooks.defaultFormat;
      }
      var output = formatMoment(this, inputString);
      return this.localeData().postformat(output);
    }

    function from (time, withoutSuffix) {
      if (this.isValid() &&
        ((isMoment(time) && time.isValid()) ||
        local__createLocal(time).isValid())) {
        return create__createDuration({to: this, from: time}).locale(this.locale()).humanize(!withoutSuffix);
      } else {
        return this.localeData().invalidDate();
      }
    }

    function fromNow (withoutSuffix) {
      return this.from(local__createLocal(), withoutSuffix);
    }

    function to (time, withoutSuffix) {
      if (this.isValid() &&
        ((isMoment(time) && time.isValid()) ||
        local__createLocal(time).isValid())) {
        return create__createDuration({from: this, to: time}).locale(this.locale()).humanize(!withoutSuffix);
      } else {
        return this.localeData().invalidDate();
      }
    }

    function toNow (withoutSuffix) {
      return this.to(local__createLocal(), withoutSuffix);
    }

    // If passed a locale key, it will set the locale for this
    // instance.  Otherwise, it will return the locale configuration
    // variables for this instance.
    function locale (key) {
      var newLocaleData;

      if (key === undefined) {
        return this._locale._abbr;
      } else {
        newLocaleData = locale_locales__getLocale(key);
        if (newLocaleData != null) {
          this._locale = newLocaleData;
        }
        return this;
      }
    }

    var lang = deprecate(
      'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
      function (key) {
        if (key === undefined) {
          return this.localeData();
        } else {
          return this.locale(key);
        }
      }
    );

    function localeData () {
      return this._locale;
    }

    function startOf (units) {
      units = normalizeUnits(units);
      // the following switch intentionally omits break keywords
      // to utilize falling through the cases.
      switch (units) {
        case 'year':
          this.month(0);
        /* falls through */
        case 'quarter':
        case 'month':
          this.date(1);
        /* falls through */
        case 'week':
        case 'isoWeek':
        case 'day':
        case 'date':
          this.hours(0);
        /* falls through */
        case 'hour':
          this.minutes(0);
        /* falls through */
        case 'minute':
          this.seconds(0);
        /* falls through */
        case 'second':
          this.milliseconds(0);
      }

      // weeks are a special case
      if (units === 'week') {
        this.weekday(0);
      }
      if (units === 'isoWeek') {
        this.isoWeekday(1);
      }

      // quarters are also special
      if (units === 'quarter') {
        this.month(Math.floor(this.month() / 3) * 3);
      }

      return this;
    }

    function endOf (units) {
      units = normalizeUnits(units);
      if (units === undefined || units === 'millisecond') {
        return this;
      }

      // 'date' is an alias for 'day', so it should be considered as such.
      if (units === 'date') {
        units = 'day';
      }

      return this.startOf(units).add(1, (units === 'isoWeek' ? 'week' : units)).subtract(1, 'ms');
    }

    function to_type__valueOf () {
      return this._d.valueOf() - ((this._offset || 0) * 60000);
    }

    function unix () {
      return Math.floor(this.valueOf() / 1000);
    }

    function toDate () {
      return new Date(this.valueOf());
    }

    function toArray () {
      var m = this;
      return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
    }

    function toObject () {
      var m = this;
      return {
        years: m.year(),
        months: m.month(),
        date: m.date(),
        hours: m.hours(),
        minutes: m.minutes(),
        seconds: m.seconds(),
        milliseconds: m.milliseconds()
      };
    }

    function toJSON () {
      // new Date(NaN).toJSON() === null
      return this.isValid() ? this.toISOString() : null;
    }

    function moment_valid__isValid () {
      return valid__isValid(this);
    }

    function parsingFlags () {
      return extend({}, getParsingFlags(this));
    }

    function invalidAt () {
      return getParsingFlags(this).overflow;
    }

    function creationData() {
      return {
        input: this._i,
        format: this._f,
        locale: this._locale,
        isUTC: this._isUTC,
        strict: this._strict
      };
    }

    // FORMATTING

    addFormatToken(0, ['gg', 2], 0, function () {
      return this.weekYear() % 100;
    });

    addFormatToken(0, ['GG', 2], 0, function () {
      return this.isoWeekYear() % 100;
    });

    function addWeekYearFormatToken (token, getter) {
      addFormatToken(0, [token, token.length], 0, getter);
    }

    addWeekYearFormatToken('gggg',     'weekYear');
    addWeekYearFormatToken('ggggg',    'weekYear');
    addWeekYearFormatToken('GGGG',  'isoWeekYear');
    addWeekYearFormatToken('GGGGG', 'isoWeekYear');

    // ALIASES

    addUnitAlias('weekYear', 'gg');
    addUnitAlias('isoWeekYear', 'GG');

    // PRIORITY

    addUnitPriority('weekYear', 1);
    addUnitPriority('isoWeekYear', 1);


    // PARSING

    addRegexToken('G',      matchSigned);
    addRegexToken('g',      matchSigned);
    addRegexToken('GG',     match1to2, match2);
    addRegexToken('gg',     match1to2, match2);
    addRegexToken('GGGG',   match1to4, match4);
    addRegexToken('gggg',   match1to4, match4);
    addRegexToken('GGGGG',  match1to6, match6);
    addRegexToken('ggggg',  match1to6, match6);

    addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
      week[token.substr(0, 2)] = toInt(input);
    });

    addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
      week[token] = utils_hooks__hooks.parseTwoDigitYear(input);
    });

    // MOMENTS

    function getSetWeekYear (input) {
      return getSetWeekYearHelper.call(this,
        input,
        this.week(),
        this.weekday(),
        this.localeData()._week.dow,
        this.localeData()._week.doy);
    }

    function getSetISOWeekYear (input) {
      return getSetWeekYearHelper.call(this,
        input, this.isoWeek(), this.isoWeekday(), 1, 4);
    }

    function getISOWeeksInYear () {
      return weeksInYear(this.year(), 1, 4);
    }

    function getWeeksInYear () {
      var weekInfo = this.localeData()._week;
      return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
    }

    function getSetWeekYearHelper(input, week, weekday, dow, doy) {
      var weeksTarget;
      if (input == null) {
        return weekOfYear(this, dow, doy).year;
      } else {
        weeksTarget = weeksInYear(input, dow, doy);
        if (week > weeksTarget) {
          week = weeksTarget;
        }
        return setWeekAll.call(this, input, week, weekday, dow, doy);
      }
    }

    function setWeekAll(weekYear, week, weekday, dow, doy) {
      var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
        date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

      this.year(date.getUTCFullYear());
      this.month(date.getUTCMonth());
      this.date(date.getUTCDate());
      return this;
    }

    // FORMATTING

    addFormatToken('Q', 0, 'Qo', 'quarter');

    // ALIASES

    addUnitAlias('quarter', 'Q');

    // PRIORITY

    addUnitPriority('quarter', 7);

    // PARSING

    addRegexToken('Q', match1);
    addParseToken('Q', function (input, array) {
      array[MONTH] = (toInt(input) - 1) * 3;
    });

    // MOMENTS

    function getSetQuarter (input) {
      return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
    }

    // FORMATTING

    addFormatToken('D', ['DD', 2], 'Do', 'date');

    // ALIASES

    addUnitAlias('date', 'D');

    // PRIOROITY
    addUnitPriority('date', 9);

    // PARSING

    addRegexToken('D',  match1to2);
    addRegexToken('DD', match1to2, match2);
    addRegexToken('Do', function (isStrict, locale) {
      return isStrict ? locale._ordinalParse : locale._ordinalParseLenient;
    });

    addParseToken(['D', 'DD'], DATE);
    addParseToken('Do', function (input, array) {
      array[DATE] = toInt(input.match(match1to2)[0], 10);
    });

    // MOMENTS

    var getSetDayOfMonth = makeGetSet('Date', true);

    // FORMATTING

    addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

    // ALIASES

    addUnitAlias('dayOfYear', 'DDD');

    // PRIORITY
    addUnitPriority('dayOfYear', 4);

    // PARSING

    addRegexToken('DDD',  match1to3);
    addRegexToken('DDDD', match3);
    addParseToken(['DDD', 'DDDD'], function (input, array, config) {
      config._dayOfYear = toInt(input);
    });

    // HELPERS

    // MOMENTS

    function getSetDayOfYear (input) {
      var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
      return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
    }

    // FORMATTING

    addFormatToken('m', ['mm', 2], 0, 'minute');

    // ALIASES

    addUnitAlias('minute', 'm');

    // PRIORITY

    addUnitPriority('minute', 14);

    // PARSING

    addRegexToken('m',  match1to2);
    addRegexToken('mm', match1to2, match2);
    addParseToken(['m', 'mm'], MINUTE);

    // MOMENTS

    var getSetMinute = makeGetSet('Minutes', false);

    // FORMATTING

    addFormatToken('s', ['ss', 2], 0, 'second');

    // ALIASES

    addUnitAlias('second', 's');

    // PRIORITY

    addUnitPriority('second', 15);

    // PARSING

    addRegexToken('s',  match1to2);
    addRegexToken('ss', match1to2, match2);
    addParseToken(['s', 'ss'], SECOND);

    // MOMENTS

    var getSetSecond = makeGetSet('Seconds', false);

    // FORMATTING

    addFormatToken('S', 0, 0, function () {
      return ~~(this.millisecond() / 100);
    });

    addFormatToken(0, ['SS', 2], 0, function () {
      return ~~(this.millisecond() / 10);
    });

    addFormatToken(0, ['SSS', 3], 0, 'millisecond');
    addFormatToken(0, ['SSSS', 4], 0, function () {
      return this.millisecond() * 10;
    });
    addFormatToken(0, ['SSSSS', 5], 0, function () {
      return this.millisecond() * 100;
    });
    addFormatToken(0, ['SSSSSS', 6], 0, function () {
      return this.millisecond() * 1000;
    });
    addFormatToken(0, ['SSSSSSS', 7], 0, function () {
      return this.millisecond() * 10000;
    });
    addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
      return this.millisecond() * 100000;
    });
    addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
      return this.millisecond() * 1000000;
    });


    // ALIASES

    addUnitAlias('millisecond', 'ms');

    // PRIORITY

    addUnitPriority('millisecond', 16);

    // PARSING

    addRegexToken('S',    match1to3, match1);
    addRegexToken('SS',   match1to3, match2);
    addRegexToken('SSS',  match1to3, match3);

    var token;
    for (token = 'SSSS'; token.length <= 9; token += 'S') {
      addRegexToken(token, matchUnsigned);
    }

    function parseMs(input, array) {
      array[MILLISECOND] = toInt(('0.' + input) * 1000);
    }

    for (token = 'S'; token.length <= 9; token += 'S') {
      addParseToken(token, parseMs);
    }
    // MOMENTS

    var getSetMillisecond = makeGetSet('Milliseconds', false);

    // FORMATTING

    addFormatToken('z',  0, 0, 'zoneAbbr');
    addFormatToken('zz', 0, 0, 'zoneName');

    // MOMENTS

    function getZoneAbbr () {
      return this._isUTC ? 'UTC' : '';
    }

    function getZoneName () {
      return this._isUTC ? 'Coordinated Universal Time' : '';
    }

    var momentPrototype__proto = Moment.prototype;

    momentPrototype__proto.add               = add_subtract__add;
    momentPrototype__proto.calendar          = moment_calendar__calendar;
    momentPrototype__proto.clone             = clone;
    momentPrototype__proto.diff              = diff;
    momentPrototype__proto.endOf             = endOf;
    momentPrototype__proto.format            = format;
    momentPrototype__proto.from              = from;
    momentPrototype__proto.fromNow           = fromNow;
    momentPrototype__proto.to                = to;
    momentPrototype__proto.toNow             = toNow;
    momentPrototype__proto.get               = stringGet;
    momentPrototype__proto.invalidAt         = invalidAt;
    momentPrototype__proto.isAfter           = isAfter;
    momentPrototype__proto.isBefore          = isBefore;
    momentPrototype__proto.isBetween         = isBetween;
    momentPrototype__proto.isSame            = isSame;
    momentPrototype__proto.isSameOrAfter     = isSameOrAfter;
    momentPrototype__proto.isSameOrBefore    = isSameOrBefore;
    momentPrototype__proto.isValid           = moment_valid__isValid;
    momentPrototype__proto.lang              = lang;
    momentPrototype__proto.locale            = locale;
    momentPrototype__proto.localeData        = localeData;
    momentPrototype__proto.max               = prototypeMax;
    momentPrototype__proto.min               = prototypeMin;
    momentPrototype__proto.parsingFlags      = parsingFlags;
    momentPrototype__proto.set               = stringSet;
    momentPrototype__proto.startOf           = startOf;
    momentPrototype__proto.subtract          = add_subtract__subtract;
    momentPrototype__proto.toArray           = toArray;
    momentPrototype__proto.toObject          = toObject;
    momentPrototype__proto.toDate            = toDate;
    momentPrototype__proto.toISOString       = moment_format__toISOString;
    momentPrototype__proto.toJSON            = toJSON;
    momentPrototype__proto.toString          = toString;
    momentPrototype__proto.unix              = unix;
    momentPrototype__proto.valueOf           = to_type__valueOf;
    momentPrototype__proto.creationData      = creationData;

    // Year
    momentPrototype__proto.year       = getSetYear;
    momentPrototype__proto.isLeapYear = getIsLeapYear;

    // Week Year
    momentPrototype__proto.weekYear    = getSetWeekYear;
    momentPrototype__proto.isoWeekYear = getSetISOWeekYear;

    // Quarter
    momentPrototype__proto.quarter = momentPrototype__proto.quarters = getSetQuarter;

    // Month
    momentPrototype__proto.month       = getSetMonth;
    momentPrototype__proto.daysInMonth = getDaysInMonth;

    // Week
    momentPrototype__proto.week           = momentPrototype__proto.weeks        = getSetWeek;
    momentPrototype__proto.isoWeek        = momentPrototype__proto.isoWeeks     = getSetISOWeek;
    momentPrototype__proto.weeksInYear    = getWeeksInYear;
    momentPrototype__proto.isoWeeksInYear = getISOWeeksInYear;

    // Day
    momentPrototype__proto.date       = getSetDayOfMonth;
    momentPrototype__proto.day        = momentPrototype__proto.days             = getSetDayOfWeek;
    momentPrototype__proto.weekday    = getSetLocaleDayOfWeek;
    momentPrototype__proto.isoWeekday = getSetISODayOfWeek;
    momentPrototype__proto.dayOfYear  = getSetDayOfYear;

    // Hour
    momentPrototype__proto.hour = momentPrototype__proto.hours = getSetHour;

    // Minute
    momentPrototype__proto.minute = momentPrototype__proto.minutes = getSetMinute;

    // Second
    momentPrototype__proto.second = momentPrototype__proto.seconds = getSetSecond;

    // Millisecond
    momentPrototype__proto.millisecond = momentPrototype__proto.milliseconds = getSetMillisecond;

    // Offset
    momentPrototype__proto.utcOffset            = getSetOffset;
    momentPrototype__proto.utc                  = setOffsetToUTC;
    momentPrototype__proto.local                = setOffsetToLocal;
    momentPrototype__proto.parseZone            = setOffsetToParsedOffset;
    momentPrototype__proto.hasAlignedHourOffset = hasAlignedHourOffset;
    momentPrototype__proto.isDST                = isDaylightSavingTime;
    momentPrototype__proto.isLocal              = isLocal;
    momentPrototype__proto.isUtcOffset          = isUtcOffset;
    momentPrototype__proto.isUtc                = isUtc;
    momentPrototype__proto.isUTC                = isUtc;

    // Timezone
    momentPrototype__proto.zoneAbbr = getZoneAbbr;
    momentPrototype__proto.zoneName = getZoneName;

    // Deprecations
    momentPrototype__proto.dates  = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
    momentPrototype__proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
    momentPrototype__proto.years  = deprecate('years accessor is deprecated. Use year instead', getSetYear);
    momentPrototype__proto.zone   = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
    momentPrototype__proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);

    var momentPrototype = momentPrototype__proto;

    function moment__createUnix (input) {
      return local__createLocal(input * 1000);
    }

    function moment__createInZone () {
      return local__createLocal.apply(null, arguments).parseZone();
    }

    function preParsePostFormat (string) {
      return string;
    }

    var prototype__proto = Locale.prototype;

    prototype__proto.calendar        = locale_calendar__calendar;
    prototype__proto.longDateFormat  = longDateFormat;
    prototype__proto.invalidDate     = invalidDate;
    prototype__proto.ordinal         = ordinal;
    prototype__proto.preparse        = preParsePostFormat;
    prototype__proto.postformat      = preParsePostFormat;
    prototype__proto.relativeTime    = relative__relativeTime;
    prototype__proto.pastFuture      = pastFuture;
    prototype__proto.set             = locale_set__set;

    // Month
    prototype__proto.months            =        localeMonths;
    prototype__proto.monthsShort       =        localeMonthsShort;
    prototype__proto.monthsParse       =        localeMonthsParse;
    prototype__proto.monthsRegex       = monthsRegex;
    prototype__proto.monthsShortRegex  = monthsShortRegex;

    // Week
    prototype__proto.week = localeWeek;
    prototype__proto.firstDayOfYear = localeFirstDayOfYear;
    prototype__proto.firstDayOfWeek = localeFirstDayOfWeek;

    // Day of Week
    prototype__proto.weekdays       =        localeWeekdays;
    prototype__proto.weekdaysMin    =        localeWeekdaysMin;
    prototype__proto.weekdaysShort  =        localeWeekdaysShort;
    prototype__proto.weekdaysParse  =        localeWeekdaysParse;

    prototype__proto.weekdaysRegex       =        weekdaysRegex;
    prototype__proto.weekdaysShortRegex  =        weekdaysShortRegex;
    prototype__proto.weekdaysMinRegex    =        weekdaysMinRegex;

    // Hours
    prototype__proto.isPM = localeIsPM;
    prototype__proto.meridiem = localeMeridiem;

    function lists__get (format, index, field, setter) {
      var locale = locale_locales__getLocale();
      var utc = create_utc__createUTC().set(setter, index);
      return locale[field](utc, format);
    }

    function listMonthsImpl (format, index, field) {
      if (typeof format === 'number') {
        index = format;
        format = undefined;
      }

      format = format || '';

      if (index != null) {
        return lists__get(format, index, field, 'month');
      }

      var i;
      var out = [];
      for (i = 0; i < 12; i++) {
        out[i] = lists__get(format, i, field, 'month');
      }
      return out;
    }

    // ()
    // (5)
    // (fmt, 5)
    // (fmt)
    // (true)
    // (true, 5)
    // (true, fmt, 5)
    // (true, fmt)
    function listWeekdaysImpl (localeSorted, format, index, field) {
      if (typeof localeSorted === 'boolean') {
        if (typeof format === 'number') {
          index = format;
          format = undefined;
        }

        format = format || '';
      } else {
        format = localeSorted;
        index = format;
        localeSorted = false;

        if (typeof format === 'number') {
          index = format;
          format = undefined;
        }

        format = format || '';
      }

      var locale = locale_locales__getLocale(),
        shift = localeSorted ? locale._week.dow : 0;

      if (index != null) {
        return lists__get(format, (index + shift) % 7, field, 'day');
      }

      var i;
      var out = [];
      for (i = 0; i < 7; i++) {
        out[i] = lists__get(format, (i + shift) % 7, field, 'day');
      }
      return out;
    }

    function lists__listMonths (format, index) {
      return listMonthsImpl(format, index, 'months');
    }

    function lists__listMonthsShort (format, index) {
      return listMonthsImpl(format, index, 'monthsShort');
    }

    function lists__listWeekdays (localeSorted, format, index) {
      return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
    }

    function lists__listWeekdaysShort (localeSorted, format, index) {
      return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
    }

    function lists__listWeekdaysMin (localeSorted, format, index) {
      return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
    }

    locale_locales__getSetGlobalLocale('en', {
      ordinalParse: /\d{1,2}(th|st|nd|rd)/,
      ordinal : function (number) {
        var b = number % 10,
          output = (toInt(number % 100 / 10) === 1) ? 'th' :
            (b === 1) ? 'st' :
              (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
        return number + output;
      }
    });

    // Side effect imports
    utils_hooks__hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', locale_locales__getSetGlobalLocale);
    utils_hooks__hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', locale_locales__getLocale);

    var mathAbs = Math.abs;

    function duration_abs__abs () {
      var data           = this._data;

      this._milliseconds = mathAbs(this._milliseconds);
      this._days         = mathAbs(this._days);
      this._months       = mathAbs(this._months);

      data.milliseconds  = mathAbs(data.milliseconds);
      data.seconds       = mathAbs(data.seconds);
      data.minutes       = mathAbs(data.minutes);
      data.hours         = mathAbs(data.hours);
      data.months        = mathAbs(data.months);
      data.years         = mathAbs(data.years);

      return this;
    }

    function duration_add_subtract__addSubtract (duration, input, value, direction) {
      var other = create__createDuration(input, value);

      duration._milliseconds += direction * other._milliseconds;
      duration._days         += direction * other._days;
      duration._months       += direction * other._months;

      return duration._bubble();
    }

    // supports only 2.0-style add(1, 's') or add(duration)
    function duration_add_subtract__add (input, value) {
      return duration_add_subtract__addSubtract(this, input, value, 1);
    }

    // supports only 2.0-style subtract(1, 's') or subtract(duration)
    function duration_add_subtract__subtract (input, value) {
      return duration_add_subtract__addSubtract(this, input, value, -1);
    }

    function absCeil (number) {
      if (number < 0) {
        return Math.floor(number);
      } else {
        return Math.ceil(number);
      }
    }

    function bubble () {
      var milliseconds = this._milliseconds;
      var days         = this._days;
      var months       = this._months;
      var data         = this._data;
      var seconds, minutes, hours, years, monthsFromDays;

      // if we have a mix of positive and negative values, bubble down first
      // check: https://github.com/moment/moment/issues/2166
      if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
        (milliseconds <= 0 && days <= 0 && months <= 0))) {
        milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
        days = 0;
        months = 0;
      }

      // The following code bubbles up values, see the tests for
      // examples of what that means.
      data.milliseconds = milliseconds % 1000;

      seconds           = absFloor(milliseconds / 1000);
      data.seconds      = seconds % 60;

      minutes           = absFloor(seconds / 60);
      data.minutes      = minutes % 60;

      hours             = absFloor(minutes / 60);
      data.hours        = hours % 24;

      days += absFloor(hours / 24);

      // convert days to months
      monthsFromDays = absFloor(daysToMonths(days));
      months += monthsFromDays;
      days -= absCeil(monthsToDays(monthsFromDays));

      // 12 months -> 1 year
      years = absFloor(months / 12);
      months %= 12;

      data.days   = days;
      data.months = months;
      data.years  = years;

      return this;
    }

    function daysToMonths (days) {
      // 400 years have 146097 days (taking into account leap year rules)
      // 400 years have 12 months === 4800
      return days * 4800 / 146097;
    }

    function monthsToDays (months) {
      // the reverse of daysToMonths
      return months * 146097 / 4800;
    }

    function as (units) {
      var days;
      var months;
      var milliseconds = this._milliseconds;

      units = normalizeUnits(units);

      if (units === 'month' || units === 'year') {
        days   = this._days   + milliseconds / 864e5;
        months = this._months + daysToMonths(days);
        return units === 'month' ? months : months / 12;
      } else {
        // handle milliseconds separately because of floating point math errors (issue #1867)
        days = this._days + Math.round(monthsToDays(this._months));
        switch (units) {
          case 'week'   : return days / 7     + milliseconds / 6048e5;
          case 'day'    : return days         + milliseconds / 864e5;
          case 'hour'   : return days * 24    + milliseconds / 36e5;
          case 'minute' : return days * 1440  + milliseconds / 6e4;
          case 'second' : return days * 86400 + milliseconds / 1000;
          // Math.floor prevents floating point math errors here
          case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
          default: throw new Error('Unknown unit ' + units);
        }
      }
    }

    // TODO: Use this.as('ms')?
    function duration_as__valueOf () {
      return (
        this._milliseconds +
        this._days * 864e5 +
        (this._months % 12) * 2592e6 +
        toInt(this._months / 12) * 31536e6
      );
    }

    function makeAs (alias) {
      return function () {
        return this.as(alias);
      };
    }

    var asMilliseconds = makeAs('ms');
    var asSeconds      = makeAs('s');
    var asMinutes      = makeAs('m');
    var asHours        = makeAs('h');
    var asDays         = makeAs('d');
    var asWeeks        = makeAs('w');
    var asMonths       = makeAs('M');
    var asYears        = makeAs('y');

    function duration_get__get (units) {
      units = normalizeUnits(units);
      return this[units + 's']();
    }

    function makeGetter(name) {
      return function () {
        return this._data[name];
      };
    }

    var milliseconds = makeGetter('milliseconds');
    var seconds      = makeGetter('seconds');
    var minutes      = makeGetter('minutes');
    var hours        = makeGetter('hours');
    var days         = makeGetter('days');
    var months       = makeGetter('months');
    var years        = makeGetter('years');

    function weeks () {
      return absFloor(this.days() / 7);
    }

    var round = Math.round;
    var thresholds = {
      s: 45,  // seconds to minute
      m: 45,  // minutes to hour
      h: 22,  // hours to day
      d: 26,  // days to month
      M: 11   // months to year
    };

    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
      return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function duration_humanize__relativeTime (posNegDuration, withoutSuffix, locale) {
      var duration = create__createDuration(posNegDuration).abs();
      var seconds  = round(duration.as('s'));
      var minutes  = round(duration.as('m'));
      var hours    = round(duration.as('h'));
      var days     = round(duration.as('d'));
      var months   = round(duration.as('M'));
      var years    = round(duration.as('y'));

      var a = seconds < thresholds.s && ['s', seconds]  ||
        minutes <= 1           && ['m']           ||
        minutes < thresholds.m && ['mm', minutes] ||
        hours   <= 1           && ['h']           ||
        hours   < thresholds.h && ['hh', hours]   ||
        days    <= 1           && ['d']           ||
        days    < thresholds.d && ['dd', days]    ||
        months  <= 1           && ['M']           ||
        months  < thresholds.M && ['MM', months]  ||
        years   <= 1           && ['y']           || ['yy', years];

      a[2] = withoutSuffix;
      a[3] = +posNegDuration > 0;
      a[4] = locale;
      return substituteTimeAgo.apply(null, a);
    }

    // This function allows you to set the rounding function for relative time strings
    function duration_humanize__getSetRelativeTimeRounding (roundingFunction) {
      if (roundingFunction === undefined) {
        return round;
      }
      if (typeof(roundingFunction) === 'function') {
        round = roundingFunction;
        return true;
      }
      return false;
    }

    // This function allows you to set a threshold for relative time strings
    function duration_humanize__getSetRelativeTimeThreshold (threshold, limit) {
      if (thresholds[threshold] === undefined) {
        return false;
      }
      if (limit === undefined) {
        return thresholds[threshold];
      }
      thresholds[threshold] = limit;
      return true;
    }

    function humanize (withSuffix) {
      var locale = this.localeData();
      var output = duration_humanize__relativeTime(this, !withSuffix, locale);

      if (withSuffix) {
        output = locale.pastFuture(+this, output);
      }

      return locale.postformat(output);
    }

    var iso_string__abs = Math.abs;

    function iso_string__toISOString() {
      // for ISO strings we do not use the normal bubbling rules:
      //  * milliseconds bubble up until they become hours
      //  * days do not bubble at all
      //  * months bubble up until they become years
      // This is because there is no context-free conversion between hours and days
      // (think of clock changes)
      // and also not between days and months (28-31 days per month)
      var seconds = iso_string__abs(this._milliseconds) / 1000;
      var days         = iso_string__abs(this._days);
      var months       = iso_string__abs(this._months);
      var minutes, hours, years;

      // 3600 seconds -> 60 minutes -> 1 hour
      minutes           = absFloor(seconds / 60);
      hours             = absFloor(minutes / 60);
      seconds %= 60;
      minutes %= 60;

      // 12 months -> 1 year
      years  = absFloor(months / 12);
      months %= 12;


      // inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
      var Y = years;
      var M = months;
      var D = days;
      var h = hours;
      var m = minutes;
      var s = seconds;
      var total = this.asSeconds();

      if (!total) {
        // this is the same as C#'s (Noda) and python (isodate)...
        // but not other JS (goog.date)
        return 'P0D';
      }

      return (total < 0 ? '-' : '') +
        'P' +
        (Y ? Y + 'Y' : '') +
        (M ? M + 'M' : '') +
        (D ? D + 'D' : '') +
        ((h || m || s) ? 'T' : '') +
        (h ? h + 'H' : '') +
        (m ? m + 'M' : '') +
        (s ? s + 'S' : '');
    }

    var duration_prototype__proto = Duration.prototype;

    duration_prototype__proto.abs            = duration_abs__abs;
    duration_prototype__proto.add            = duration_add_subtract__add;
    duration_prototype__proto.subtract       = duration_add_subtract__subtract;
    duration_prototype__proto.as             = as;
    duration_prototype__proto.asMilliseconds = asMilliseconds;
    duration_prototype__proto.asSeconds      = asSeconds;
    duration_prototype__proto.asMinutes      = asMinutes;
    duration_prototype__proto.asHours        = asHours;
    duration_prototype__proto.asDays         = asDays;
    duration_prototype__proto.asWeeks        = asWeeks;
    duration_prototype__proto.asMonths       = asMonths;
    duration_prototype__proto.asYears        = asYears;
    duration_prototype__proto.valueOf        = duration_as__valueOf;
    duration_prototype__proto._bubble        = bubble;
    duration_prototype__proto.get            = duration_get__get;
    duration_prototype__proto.milliseconds   = milliseconds;
    duration_prototype__proto.seconds        = seconds;
    duration_prototype__proto.minutes        = minutes;
    duration_prototype__proto.hours          = hours;
    duration_prototype__proto.days           = days;
    duration_prototype__proto.weeks          = weeks;
    duration_prototype__proto.months         = months;
    duration_prototype__proto.years          = years;
    duration_prototype__proto.humanize       = humanize;
    duration_prototype__proto.toISOString    = iso_string__toISOString;
    duration_prototype__proto.toString       = iso_string__toISOString;
    duration_prototype__proto.toJSON         = iso_string__toISOString;
    duration_prototype__proto.locale         = locale;
    duration_prototype__proto.localeData     = localeData;

    // Deprecations
    duration_prototype__proto.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', iso_string__toISOString);
    duration_prototype__proto.lang = lang;

    // Side effect imports

    // FORMATTING

    addFormatToken('X', 0, 0, 'unix');
    addFormatToken('x', 0, 0, 'valueOf');

    // PARSING

    addRegexToken('x', matchSigned);
    addRegexToken('X', matchTimestamp);
    addParseToken('X', function (input, array, config) {
      config._d = new Date(parseFloat(input, 10) * 1000);
    });
    addParseToken('x', function (input, array, config) {
      config._d = new Date(toInt(input));
    });

    // Side effect imports


    utils_hooks__hooks.version = '2.14.1';

    setHookCallback(local__createLocal);

    utils_hooks__hooks.fn                    = momentPrototype;
    utils_hooks__hooks.min                   = min;
    utils_hooks__hooks.max                   = max;
    utils_hooks__hooks.now                   = now;
    utils_hooks__hooks.utc                   = create_utc__createUTC;
    utils_hooks__hooks.unix                  = moment__createUnix;
    utils_hooks__hooks.months                = lists__listMonths;
    utils_hooks__hooks.isDate                = isDate;
    utils_hooks__hooks.locale                = locale_locales__getSetGlobalLocale;
    utils_hooks__hooks.invalid               = valid__createInvalid;
    utils_hooks__hooks.duration              = create__createDuration;
    utils_hooks__hooks.isMoment              = isMoment;
    utils_hooks__hooks.weekdays              = lists__listWeekdays;
    utils_hooks__hooks.parseZone             = moment__createInZone;
    utils_hooks__hooks.localeData            = locale_locales__getLocale;
    utils_hooks__hooks.isDuration            = isDuration;
    utils_hooks__hooks.monthsShort           = lists__listMonthsShort;
    utils_hooks__hooks.weekdaysMin           = lists__listWeekdaysMin;
    utils_hooks__hooks.defineLocale          = defineLocale;
    utils_hooks__hooks.updateLocale          = updateLocale;
    utils_hooks__hooks.locales               = locale_locales__listLocales;
    utils_hooks__hooks.weekdaysShort         = lists__listWeekdaysShort;
    utils_hooks__hooks.normalizeUnits        = normalizeUnits;
    utils_hooks__hooks.relativeTimeRounding = duration_humanize__getSetRelativeTimeRounding;
    utils_hooks__hooks.relativeTimeThreshold = duration_humanize__getSetRelativeTimeThreshold;
    utils_hooks__hooks.calendarFormat        = getCalendarFormat;
    utils_hooks__hooks.prototype             = momentPrototype;

    var _moment = utils_hooks__hooks;

    return _moment;

  }));
},{}],5:[function(require,module,exports){
//     Underscore.js 1.8.0
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

  (function() {

    // Baseline setup
    // --------------

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    // Save the previous value of the `_` variable.
    var previousUnderscore = root._;

    // Save bytes in the minified (but not gzipped) version:
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

    // Create quick reference variables for speed access to core prototypes.
    var
      push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

    // All **ECMAScript 5** native function implementations that we hope to use
    // are declared here.
    var
      nativeIsArray      = Array.isArray,
      nativeKeys         = Object.keys,
      nativeBind         = FuncProto.bind,
      nativeCreate       = Object.create;

    // Reusable constructor function for prototype setting.
    var Ctor = function(){};

    // Create a safe reference to the Underscore object for use below.
    var _ = function(obj) {
      if (obj instanceof _) return obj;
      if (!(this instanceof _)) return new _(obj);
      this._wrapped = obj;
    };

    // Export the Underscore object for **Node.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `_` as a global object.
    if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = _;
      }
      exports._ = _;
    } else {
      root._ = _;
    }

    // Current version.
    _.VERSION = '1.8.0';

    // Internal function that returns an efficient (for current engines) version
    // of the passed-in callback, to be repeatedly applied in other Underscore
    // functions.
    var optimizeCb = function(func, context, argCount) {
      if (context === void 0) return func;
      switch (argCount == null ? 3 : argCount) {
        case 1: return function(value) {
          return func.call(context, value);
        };
        case 2: return function(value, other) {
          return func.call(context, value, other);
        };
        case 3: return function(value, index, collection) {
          return func.call(context, value, index, collection);
        };
        case 4: return function(accumulator, value, index, collection) {
          return func.call(context, accumulator, value, index, collection);
        };
      }
      return function() {
        return func.apply(context, arguments);
      };
    };

    // A mostly-internal function to generate callbacks that can be applied
    // to each element in a collection, returning the desired result — either
    // identity, an arbitrary callback, a property matcher, or a property accessor.
    var cb = function(value, context, argCount) {
      if (value == null) return _.identity;
      if (_.isFunction(value)) return optimizeCb(value, context, argCount);
      if (_.isObject(value)) return _.matcher(value);
      return _.property(value);
    };
    _.iteratee = function(value, context) {
      return cb(value, context, Infinity);
    };

    // An internal function for creating assigner functions.
    var createAssigner = function(keysFunc, undefinedOnly) {
      return function(obj) {
        var length = arguments.length;
        if (length < 2 || obj == null) return obj;
        for (var index = 1; index < length; index++) {
          var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
          for (var i = 0; i < l; i++) {
            var key = keys[i];
            if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
          }
        }
        return obj;
      };
    };

    // An internal function for creating a new object that inherits from another.
    var baseCreate = function(prototype) {
      if (!_.isObject(prototype)) return {};
      if (nativeCreate) return nativeCreate(prototype);
      Ctor.prototype = prototype;
      var result = new Ctor;
      Ctor.prototype = null;
      return result;
    };

    // Helper for collection methods to determine whether a collection
    // should be iterated as an array or as an object
    // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
    var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
    var isArrayLike = function(collection) {
      var length = collection && collection.length;
      return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
    };

    // Collection Functions
    // --------------------

    // The cornerstone, an `each` implementation, aka `forEach`.
    // Handles raw objects in addition to array-likes. Treats all
    // sparse array-likes as if they were dense.
    _.each = _.forEach = function(obj, iteratee, context) {
      iteratee = optimizeCb(iteratee, context);
      var i, length;
      if (isArrayLike(obj)) {
        for (i = 0, length = obj.length; i < length; i++) {
          iteratee(obj[i], i, obj);
        }
      } else {
        var keys = _.keys(obj);
        for (i = 0, length = keys.length; i < length; i++) {
          iteratee(obj[keys[i]], keys[i], obj);
        }
      }
      return obj;
    };

    // Return the results of applying the iteratee to each element.
    _.map = _.collect = function(obj, iteratee, context) {
      iteratee = cb(iteratee, context);
      var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
      for (var index = 0; index < length; index++) {
        var currentKey = keys ? keys[index] : index;
        results[index] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
    };

    // Create a reducing function iterating left or right.
    function createReduce(dir) {
      // Optimized iterator function as using arguments.length
      // in the main function will deoptimize the, see #1991.
      function iterator(obj, iteratee, memo, keys, index, length) {
        for (; index >= 0 && index < length; index += dir) {
          var currentKey = keys ? keys[index] : index;
          memo = iteratee(memo, obj[currentKey], currentKey, obj);
        }
        return memo;
      }

      return function(obj, iteratee, memo, context) {
        iteratee = optimizeCb(iteratee, context, 4);
        var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
        // Determine the initial value if none is provided.
        if (arguments.length < 3) {
          memo = obj[keys ? keys[index] : index];
          index += dir;
        }
        return iterator(obj, iteratee, memo, keys, index, length);
      };
    }

    // **Reduce** builds up a single result from a list of values, aka `inject`,
    // or `foldl`.
    _.reduce = _.foldl = _.inject = createReduce(1);

    // The right-associative version of reduce, also known as `foldr`.
    _.reduceRight = _.foldr = createReduce(-1);

    // Return the first value which passes a truth test. Aliased as `detect`.
    _.find = _.detect = function(obj, predicate, context) {
      var key;
      if (isArrayLike(obj)) {
        key = _.findIndex(obj, predicate, context);
      } else {
        key = _.findKey(obj, predicate, context);
      }
      if (key !== void 0 && key !== -1) return obj[key];
    };

    // Return all the elements that pass a truth test.
    // Aliased as `select`.
    _.filter = _.select = function(obj, predicate, context) {
      var results = [];
      predicate = cb(predicate, context);
      _.each(obj, function(value, index, list) {
        if (predicate(value, index, list)) results.push(value);
      });
      return results;
    };

    // Return all the elements for which a truth test fails.
    _.reject = function(obj, predicate, context) {
      return _.filter(obj, _.negate(cb(predicate)), context);
    };

    // Determine whether all of the elements match a truth test.
    // Aliased as `all`.
    _.every = _.all = function(obj, predicate, context) {
      predicate = cb(predicate, context);
      var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
      for (var index = 0; index < length; index++) {
        var currentKey = keys ? keys[index] : index;
        if (!predicate(obj[currentKey], currentKey, obj)) return false;
      }
      return true;
    };

    // Determine if at least one element in the object matches a truth test.
    // Aliased as `any`.
    _.some = _.any = function(obj, predicate, context) {
      predicate = cb(predicate, context);
      var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
      for (var index = 0; index < length; index++) {
        var currentKey = keys ? keys[index] : index;
        if (predicate(obj[currentKey], currentKey, obj)) return true;
      }
      return false;
    };

    // Determine if the array or object contains a given value (using `===`).
    // Aliased as `includes` and `include`.
    _.contains = _.includes = _.include = function(obj, target) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return _.indexOf(obj, target) >= 0;
    };

    // Invoke a method (with arguments) on every item in a collection.
    _.invoke = function(obj, method) {
      var args = slice.call(arguments, 2);
      var isFunc = _.isFunction(method);
      return _.map(obj, function(value) {
        var func = isFunc ? method : value[method];
        return func == null ? func : func.apply(value, args);
      });
    };

    // Convenience version of a common use case of `map`: fetching a property.
    _.pluck = function(obj, key) {
      return _.map(obj, _.property(key));
    };

    // Convenience version of a common use case of `filter`: selecting only objects
    // containing specific `key:value` pairs.
    _.where = function(obj, attrs) {
      return _.filter(obj, _.matcher(attrs));
    };

    // Convenience version of a common use case of `find`: getting the first object
    // containing specific `key:value` pairs.
    _.findWhere = function(obj, attrs) {
      return _.find(obj, _.matcher(attrs));
    };

    // Return the maximum element (or element-based computation).
    _.max = function(obj, iteratee, context) {
      var result = -Infinity, lastComputed = -Infinity,
        value, computed;
      if (iteratee == null && obj != null) {
        obj = isArrayLike(obj) ? obj : _.values(obj);
        for (var i = 0, length = obj.length; i < length; i++) {
          value = obj[i];
          if (value > result) {
            result = value;
          }
        }
      } else {
        iteratee = cb(iteratee, context);
        _.each(obj, function(value, index, list) {
          computed = iteratee(value, index, list);
          if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
            result = value;
            lastComputed = computed;
          }
        });
      }
      return result;
    };

    // Return the minimum element (or element-based computation).
    _.min = function(obj, iteratee, context) {
      var result = Infinity, lastComputed = Infinity,
        value, computed;
      if (iteratee == null && obj != null) {
        obj = isArrayLike(obj) ? obj : _.values(obj);
        for (var i = 0, length = obj.length; i < length; i++) {
          value = obj[i];
          if (value < result) {
            result = value;
          }
        }
      } else {
        iteratee = cb(iteratee, context);
        _.each(obj, function(value, index, list) {
          computed = iteratee(value, index, list);
          if (computed < lastComputed || computed === Infinity && result === Infinity) {
            result = value;
            lastComputed = computed;
          }
        });
      }
      return result;
    };

    // Shuffle a collection, using the modern version of the
    // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
    _.shuffle = function(obj) {
      var set = isArrayLike(obj) ? obj : _.values(obj);
      var length = set.length;
      var shuffled = Array(length);
      for (var index = 0, rand; index < length; index++) {
        rand = _.random(0, index);
        if (rand !== index) shuffled[index] = shuffled[rand];
        shuffled[rand] = set[index];
      }
      return shuffled;
    };

    // Sample **n** random values from a collection.
    // If **n** is not specified, returns a single random element.
    // The internal `guard` argument allows it to work with `map`.
    _.sample = function(obj, n, guard) {
      if (n == null || guard) {
        if (!isArrayLike(obj)) obj = _.values(obj);
        return obj[_.random(obj.length - 1)];
      }
      return _.shuffle(obj).slice(0, Math.max(0, n));
    };

    // Sort the object's values by a criterion produced by an iteratee.
    _.sortBy = function(obj, iteratee, context) {
      iteratee = cb(iteratee, context);
      return _.pluck(_.map(obj, function(value, index, list) {
        return {
          value: value,
          index: index,
          criteria: iteratee(value, index, list)
        };
      }).sort(function(left, right) {
        var a = left.criteria;
        var b = right.criteria;
        if (a !== b) {
          if (a > b || a === void 0) return 1;
          if (a < b || b === void 0) return -1;
        }
        return left.index - right.index;
      }), 'value');
    };

    // An internal function used for aggregate "group by" operations.
    var group = function(behavior) {
      return function(obj, iteratee, context) {
        var result = {};
        iteratee = cb(iteratee, context);
        _.each(obj, function(value, index) {
          var key = iteratee(value, index, obj);
          behavior(result, value, key);
        });
        return result;
      };
    };

    // Groups the object's values by a criterion. Pass either a string attribute
    // to group by, or a function that returns the criterion.
    _.groupBy = group(function(result, value, key) {
      if (_.has(result, key)) result[key].push(value); else result[key] = [value];
    });

    // Indexes the object's values by a criterion, similar to `groupBy`, but for
    // when you know that your index values will be unique.
    _.indexBy = group(function(result, value, key) {
      result[key] = value;
    });

    // Counts instances of an object that group by a certain criterion. Pass
    // either a string attribute to count by, or a function that returns the
    // criterion.
    _.countBy = group(function(result, value, key) {
      if (_.has(result, key)) result[key]++; else result[key] = 1;
    });

    // Safely create a real, live array from anything iterable.
    _.toArray = function(obj) {
      if (!obj) return [];
      if (_.isArray(obj)) return slice.call(obj);
      if (isArrayLike(obj)) return _.map(obj, _.identity);
      return _.values(obj);
    };

    // Return the number of elements in an object.
    _.size = function(obj) {
      if (obj == null) return 0;
      return isArrayLike(obj) ? obj.length : _.keys(obj).length;
    };

    // Split a collection into two arrays: one whose elements all satisfy the given
    // predicate, and one whose elements all do not satisfy the predicate.
    _.partition = function(obj, predicate, context) {
      predicate = cb(predicate, context);
      var pass = [], fail = [];
      _.each(obj, function(value, key, obj) {
        (predicate(value, key, obj) ? pass : fail).push(value);
      });
      return [pass, fail];
    };

    // Array Functions
    // ---------------

    // Get the first element of an array. Passing **n** will return the first N
    // values in the array. Aliased as `head` and `take`. The **guard** check
    // allows it to work with `_.map`.
    _.first = _.head = _.take = function(array, n, guard) {
      if (array == null) return void 0;
      if (n == null || guard) return array[0];
      return _.initial(array, array.length - n);
    };

    // Returns everything but the last entry of the array. Especially useful on
    // the arguments object. Passing **n** will return all the values in
    // the array, excluding the last N.
    _.initial = function(array, n, guard) {
      return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
    };

    // Get the last element of an array. Passing **n** will return the last N
    // values in the array.
    _.last = function(array, n, guard) {
      if (array == null) return void 0;
      if (n == null || guard) return array[array.length - 1];
      return _.rest(array, Math.max(0, array.length - n));
    };

    // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
    // Especially useful on the arguments object. Passing an **n** will return
    // the rest N values in the array.
    _.rest = _.tail = _.drop = function(array, n, guard) {
      return slice.call(array, n == null || guard ? 1 : n);
    };

    // Trim out all falsy values from an array.
    _.compact = function(array) {
      return _.filter(array, _.identity);
    };

    // Internal implementation of a recursive `flatten` function.
    var flatten = function(input, shallow, strict, startIndex) {
      var output = [], idx = 0;
      for (var i = startIndex || 0, length = input && input.length; i < length; i++) {
        var value = input[i];
        if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
          //flatten current level of array or arguments object
          if (!shallow) value = flatten(value, shallow, strict);
          var j = 0, len = value.length;
          output.length += len;
          while (j < len) {
            output[idx++] = value[j++];
          }
        } else if (!strict) {
          output[idx++] = value;
        }
      }
      return output;
    };

    // Flatten out an array, either recursively (by default), or just one level.
    _.flatten = function(array, shallow) {
      return flatten(array, shallow, false);
    };

    // Return a version of the array that does not contain the specified value(s).
    _.without = function(array) {
      return _.difference(array, slice.call(arguments, 1));
    };

    // Produce a duplicate-free version of the array. If the array has already
    // been sorted, you have the option of using a faster algorithm.
    // Aliased as `unique`.
    _.uniq = _.unique = function(array, isSorted, iteratee, context) {
      if (array == null) return [];
      if (!_.isBoolean(isSorted)) {
        context = iteratee;
        iteratee = isSorted;
        isSorted = false;
      }
      if (iteratee != null) iteratee = cb(iteratee, context);
      var result = [];
      var seen = [];
      for (var i = 0, length = array.length; i < length; i++) {
        var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
        if (isSorted) {
          if (!i || seen !== computed) result.push(value);
          seen = computed;
        } else if (iteratee) {
          if (!_.contains(seen, computed)) {
            seen.push(computed);
            result.push(value);
          }
        } else if (!_.contains(result, value)) {
          result.push(value);
        }
      }
      return result;
    };

    // Produce an array that contains the union: each distinct element from all of
    // the passed-in arrays.
    _.union = function() {
      return _.uniq(flatten(arguments, true, true));
    };

    // Produce an array that contains every item shared between all the
    // passed-in arrays.
    _.intersection = function(array) {
      if (array == null) return [];
      var result = [];
      var argsLength = arguments.length;
      for (var i = 0, length = array.length; i < length; i++) {
        var item = array[i];
        if (_.contains(result, item)) continue;
        for (var j = 1; j < argsLength; j++) {
          if (!_.contains(arguments[j], item)) break;
        }
        if (j === argsLength) result.push(item);
      }
      return result;
    };

    // Take the difference between one array and a number of other arrays.
    // Only the elements present in just the first array will remain.
    _.difference = function(array) {
      var rest = flatten(arguments, true, true, 1);
      return _.filter(array, function(value){
        return !_.contains(rest, value);
      });
    };

    // Zip together multiple lists into a single array -- elements that share
    // an index go together.
    _.zip = function() {
      return _.unzip(arguments);
    };

    // Complement of _.zip. Unzip accepts an array of arrays and groups
    // each array's elements on shared indices
    _.unzip = function(array) {
      var length = array && _.max(array, 'length').length || 0;
      var result = Array(length);

      for (var index = 0; index < length; index++) {
        result[index] = _.pluck(array, index);
      }
      return result;
    };

    // Converts lists into objects. Pass either a single array of `[key, value]`
    // pairs, or two parallel arrays of the same length -- one of keys, and one of
    // the corresponding values.
    _.object = function(list, values) {
      var result = {};
      for (var i = 0, length = list && list.length; i < length; i++) {
        if (values) {
          result[list[i]] = values[i];
        } else {
          result[list[i][0]] = list[i][1];
        }
      }
      return result;
    };

    // Return the position of the first occurrence of an item in an array,
    // or -1 if the item is not included in the array.
    // If the array is large and already in sort order, pass `true`
    // for **isSorted** to use binary search.
    _.indexOf = function(array, item, isSorted) {
      var i = 0, length = array && array.length;
      if (typeof isSorted == 'number') {
        i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
      } else if (isSorted && length) {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
      if (item !== item) {
        return _.findIndex(slice.call(array, i), _.isNaN);
      }
      for (; i < length; i++) if (array[i] === item) return i;
      return -1;
    };

    _.lastIndexOf = function(array, item, from) {
      var idx = array ? array.length : 0;
      if (typeof from == 'number') {
        idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
      }
      if (item !== item) {
        return _.findLastIndex(slice.call(array, 0, idx), _.isNaN);
      }
      while (--idx >= 0) if (array[idx] === item) return idx;
      return -1;
    };

    // Generator function to create the findIndex and findLastIndex functions
    function createIndexFinder(dir) {
      return function(array, predicate, context) {
        predicate = cb(predicate, context);
        var length = array != null && array.length;
        var index = dir > 0 ? 0 : length - 1;
        for (; index >= 0 && index < length; index += dir) {
          if (predicate(array[index], index, array)) return index;
        }
        return -1;
      };
    }

    // Returns the first index on an array-like that passes a predicate test
    _.findIndex = createIndexFinder(1);

    _.findLastIndex = createIndexFinder(-1);

    // Use a comparator function to figure out the smallest index at which
    // an object should be inserted so as to maintain order. Uses binary search.
    _.sortedIndex = function(array, obj, iteratee, context) {
      iteratee = cb(iteratee, context, 1);
      var value = iteratee(obj);
      var low = 0, high = array.length;
      while (low < high) {
        var mid = Math.floor((low + high) / 2);
        if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
      }
      return low;
    };

    // Generate an integer Array containing an arithmetic progression. A port of
    // the native Python `range()` function. See
    // [the Python documentation](http://docs.python.org/library/functions.html#range).
    _.range = function(start, stop, step) {
      if (arguments.length <= 1) {
        stop = start || 0;
        start = 0;
      }
      step = step || 1;

      var length = Math.max(Math.ceil((stop - start) / step), 0);
      var range = Array(length);

      for (var idx = 0; idx < length; idx++, start += step) {
        range[idx] = start;
      }

      return range;
    };

    // Function (ahem) Functions
    // ------------------

    // Determines whether to execute a function as a constructor
    // or a normal function with the provided arguments
    var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
      if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
      var self = baseCreate(sourceFunc.prototype);
      var result = sourceFunc.apply(self, args);
      if (_.isObject(result)) return result;
      return self;
    };

    // Create a function bound to a given object (assigning `this`, and arguments,
    // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
    // available.
    _.bind = function(func, context) {
      if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
      if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
      var args = slice.call(arguments, 2);
      return function bound() {
        return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
      };
    };

    // Partially apply a function by creating a version that has had some of its
    // arguments pre-filled, without changing its dynamic `this` context. _ acts
    // as a placeholder, allowing any combination of arguments to be pre-filled.
    _.partial = function(func) {
      var boundArgs = slice.call(arguments, 1);
      return function bound() {
        var position = 0, length = boundArgs.length;
        var args = Array(length);
        for (var i = 0; i < length; i++) {
          args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
        }
        while (position < arguments.length) args.push(arguments[position++]);
        return executeBound(func, bound, this, this, args);
      };
    };

    // Bind a number of an object's methods to that object. Remaining arguments
    // are the method names to be bound. Useful for ensuring that all callbacks
    // defined on an object belong to it.
    _.bindAll = function(obj) {
      var i, length = arguments.length, key;
      if (length <= 1) throw new Error('bindAll must be passed function names');
      for (i = 1; i < length; i++) {
        key = arguments[i];
        obj[key] = _.bind(obj[key], obj);
      }
      return obj;
    };

    // Memoize an expensive function by storing its results.
    _.memoize = function(func, hasher) {
      var memoize = function(key) {
        var cache = memoize.cache;
        var address = '' + (hasher ? hasher.apply(this, arguments) : key);
        if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
        return cache[address];
      };
      memoize.cache = {};
      return memoize;
    };

    // Delays a function for the given number of milliseconds, and then calls
    // it with the arguments supplied.
    _.delay = function(func, wait) {
      var args = slice.call(arguments, 2);
      return setTimeout(function(){
        return func.apply(null, args);
      }, wait);
    };

    // Defers a function, scheduling it to run after the current call stack has
    // cleared.
    _.defer = _.partial(_.delay, _, 1);

    // Returns a function, that, when invoked, will only be triggered at most once
    // during a given window of time. Normally, the throttled function will run
    // as much as it can, without ever going more than once per `wait` duration;
    // but if you'd like to disable the execution on the leading edge, pass
    // `{leading: false}`. To disable execution on the trailing edge, ditto.
    _.throttle = function(func, wait, options) {
      var context, args, result;
      var timeout = null;
      var previous = 0;
      if (!options) options = {};
      var later = function() {
        previous = options.leading === false ? 0 : _.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      };
      return function() {
        var now = _.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          previous = now;
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(later, remaining);
        }
        return result;
      };
    };

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    _.debounce = function(func, wait, immediate) {
      var timeout, args, context, timestamp, result;

      var later = function() {
        var last = _.now() - timestamp;

        if (last < wait && last >= 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            if (!timeout) context = args = null;
          }
        }
      };

      return function() {
        context = this;
        args = arguments;
        timestamp = _.now();
        var callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }

        return result;
      };
    };

    // Returns the first function passed as an argument to the second,
    // allowing you to adjust arguments, run code before and after, and
    // conditionally execute the original function.
    _.wrap = function(func, wrapper) {
      return _.partial(wrapper, func);
    };

    // Returns a negated version of the passed-in predicate.
    _.negate = function(predicate) {
      return function() {
        return !predicate.apply(this, arguments);
      };
    };

    // Returns a function that is the composition of a list of functions, each
    // consuming the return value of the function that follows.
    _.compose = function() {
      var args = arguments;
      var start = args.length - 1;
      return function() {
        var i = start;
        var result = args[start].apply(this, arguments);
        while (i--) result = args[i].call(this, result);
        return result;
      };
    };

    // Returns a function that will only be executed on and after the Nth call.
    _.after = function(times, func) {
      return function() {
        if (--times < 1) {
          return func.apply(this, arguments);
        }
      };
    };

    // Returns a function that will only be executed up to (but not including) the Nth call.
    _.before = function(times, func) {
      var memo;
      return function() {
        if (--times > 0) {
          memo = func.apply(this, arguments);
        }
        if (times <= 1) func = null;
        return memo;
      };
    };

    // Returns a function that will be executed at most one time, no matter how
    // often you call it. Useful for lazy initialization.
    _.once = _.partial(_.before, 2);

    // Object Functions
    // ----------------

    // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
    var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
    var nonEnumerableProps = ['constructor', 'valueOf', 'isPrototypeOf', 'toString',
      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

    function collectNonEnumProps(obj, keys) {
      var nonEnumIdx = nonEnumerableProps.length;
      var proto = typeof obj.constructor === 'function' ? FuncProto : ObjProto;

      while (nonEnumIdx--) {
        var prop = nonEnumerableProps[nonEnumIdx];
        if (prop === 'constructor' ? _.has(obj, prop) : prop in obj &&
          obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
          keys.push(prop);
        }
      }
    }

    // Retrieve the names of an object's own properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`
    _.keys = function(obj) {
      if (!_.isObject(obj)) return [];
      if (nativeKeys) return nativeKeys(obj);
      var keys = [];
      for (var key in obj) if (_.has(obj, key)) keys.push(key);
      // Ahem, IE < 9.
      if (hasEnumBug) collectNonEnumProps(obj, keys);
      return keys;
    };

    // Retrieve all the property names of an object.
    _.allKeys = function(obj) {
      if (!_.isObject(obj)) return [];
      var keys = [];
      for (var key in obj) keys.push(key);
      // Ahem, IE < 9.
      if (hasEnumBug) collectNonEnumProps(obj, keys);
      return keys;
    };

    // Retrieve the values of an object's properties.
    _.values = function(obj) {
      var keys = _.keys(obj);
      var length = keys.length;
      var values = Array(length);
      for (var i = 0; i < length; i++) {
        values[i] = obj[keys[i]];
      }
      return values;
    };

    // Returns the results of applying the iteratee to each element of the object
    // In contrast to _.map it returns an object
    _.mapObject = function(obj, iteratee, context) {
      iteratee = cb(iteratee, context);
      var keys =  _.keys(obj),
        length = keys.length,
        results = {},
        currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
    };

    // Convert an object into a list of `[key, value]` pairs.
    _.pairs = function(obj) {
      var keys = _.keys(obj);
      var length = keys.length;
      var pairs = Array(length);
      for (var i = 0; i < length; i++) {
        pairs[i] = [keys[i], obj[keys[i]]];
      }
      return pairs;
    };

    // Invert the keys and values of an object. The values must be serializable.
    _.invert = function(obj) {
      var result = {};
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        result[obj[keys[i]]] = keys[i];
      }
      return result;
    };

    // Return a sorted list of the function names available on the object.
    // Aliased as `methods`
    _.functions = _.methods = function(obj) {
      var names = [];
      for (var key in obj) {
        if (_.isFunction(obj[key])) names.push(key);
      }
      return names.sort();
    };

    // Extend a given object with all the properties in passed-in object(s).
    _.extend = createAssigner(_.allKeys);

    // Assigns a given object with all the own properties in the passed-in object(s)
    // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
    _.extendOwn = createAssigner(_.keys);

    // Returns the first key on an object that passes a predicate test
    _.findKey = function(obj, predicate, context) {
      predicate = cb(predicate, context);
      var keys = _.keys(obj), key;
      for (var i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        if (predicate(obj[key], key, obj)) return key;
      }
    };

    // Return a copy of the object only containing the whitelisted properties.
    _.pick = function(obj, iteratee, context) {
      var result = {}, key;
      if (obj == null) return result;
      if (_.isFunction(iteratee)) {
        iteratee = optimizeCb(iteratee, context);
        for (key in obj) {
          var value = obj[key];
          if (iteratee(value, key, obj)) result[key] = value;
        }
      } else {
        var keys = flatten(arguments, false, false, 1);
        obj = new Object(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
          key = keys[i];
          if (key in obj) result[key] = obj[key];
        }
      }
      return result;
    };

    // Return a copy of the object without the blacklisted properties.
    _.omit = function(obj, iteratee, context) {
      if (_.isFunction(iteratee)) {
        iteratee = _.negate(iteratee);
      } else {
        var keys = _.map(flatten(arguments, false, false, 1), String);
        iteratee = function(value, key) {
          return !_.contains(keys, key);
        };
      }
      return _.pick(obj, iteratee, context);
    };

    // Fill in a given object with default properties.
    _.defaults = createAssigner(_.allKeys, true);

    // Create a (shallow-cloned) duplicate of an object.
    _.clone = function(obj) {
      if (!_.isObject(obj)) return obj;
      return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
    };

    // Invokes interceptor with the obj, and then returns obj.
    // The primary purpose of this method is to "tap into" a method chain, in
    // order to perform operations on intermediate results within the chain.
    _.tap = function(obj, interceptor) {
      interceptor(obj);
      return obj;
    };

    // Returns whether an object has a given set of `key:value` pairs.
    _.isMatch = function(object, attrs) {
      var keys = _.keys(attrs), length = keys.length;
      if (object == null) return !length;
      var obj = Object(object);
      for (var i = 0; i < length; i++) {
        var key = keys[i];
        if (attrs[key] !== obj[key] || !(key in obj)) return false;
      }
      return true;
    };


    // Internal recursive comparison function for `isEqual`.
    var eq = function(a, b, aStack, bStack) {
      // Identical objects are equal. `0 === -0`, but they aren't identical.
      // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
      if (a === b) return a !== 0 || 1 / a === 1 / b;
      // A strict comparison is necessary because `null == undefined`.
      if (a == null || b == null) return a === b;
      // Unwrap any wrapped objects.
      if (a instanceof _) a = a._wrapped;
      if (b instanceof _) b = b._wrapped;
      // Compare `[[Class]]` names.
      var className = toString.call(a);
      if (className !== toString.call(b)) return false;
      switch (className) {
        // Strings, numbers, regular expressions, dates, and booleans are compared by value.
        case '[object RegExp]':
        // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
        case '[object String]':
          // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
          // equivalent to `new String("5")`.
          return '' + a === '' + b;
        case '[object Number]':
          // `NaN`s are equivalent, but non-reflexive.
          // Object(NaN) is equivalent to NaN
          if (+a !== +a) return +b !== +b;
          // An `egal` comparison is performed for other numeric values.
          return +a === 0 ? 1 / +a === 1 / b : +a === +b;
        case '[object Date]':
        case '[object Boolean]':
          // Coerce dates and booleans to numeric primitive values. Dates are compared by their
          // millisecond representations. Note that invalid dates with millisecond representations
          // of `NaN` are not equivalent.
          return +a === +b;
      }

      var areArrays = className === '[object Array]';
      if (!areArrays) {
        if (typeof a != 'object' || typeof b != 'object') return false;

        // Objects with different constructors are not equivalent, but `Object`s or `Array`s
        // from different frames are.
        var aCtor = a.constructor, bCtor = b.constructor;
        if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
          _.isFunction(bCtor) && bCtor instanceof bCtor)
          && ('constructor' in a && 'constructor' in b)) {
          return false;
        }
      }
      // Assume equality for cyclic structures. The algorithm for detecting cyclic
      // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

      // Initializing stack of traversed objects.
      // It's done here since we only need them for objects and arrays comparison.
      aStack = aStack || [];
      bStack = bStack || [];
      var length = aStack.length;
      while (length--) {
        // Linear search. Performance is inversely proportional to the number of
        // unique nested structures.
        if (aStack[length] === a) return bStack[length] === b;
      }

      // Add the first object to the stack of traversed objects.
      aStack.push(a);
      bStack.push(b);

      // Recursively compare objects and arrays.
      if (areArrays) {
        // Compare array lengths to determine if a deep comparison is necessary.
        length = a.length;
        if (length !== b.length) return false;
        // Deep compare the contents, ignoring non-numeric properties.
        while (length--) {
          if (!eq(a[length], b[length], aStack, bStack)) return false;
        }
      } else {
        // Deep compare objects.
        var keys = _.keys(a), key;
        length = keys.length;
        // Ensure that both objects contain the same number of properties before comparing deep equality.
        if (_.keys(b).length !== length) return false;
        while (length--) {
          // Deep compare each member
          key = keys[length];
          if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
        }
      }
      // Remove the first object from the stack of traversed objects.
      aStack.pop();
      bStack.pop();
      return true;
    };

    // Perform a deep comparison to check if two objects are equal.
    _.isEqual = function(a, b) {
      return eq(a, b);
    };

    // Is a given array, string, or object empty?
    // An "empty" object has no enumerable own-properties.
    _.isEmpty = function(obj) {
      if (obj == null) return true;
      if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
      return _.keys(obj).length === 0;
    };

    // Is a given value a DOM element?
    _.isElement = function(obj) {
      return !!(obj && obj.nodeType === 1);
    };

    // Is a given value an array?
    // Delegates to ECMA5's native Array.isArray
    _.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) === '[object Array]';
      };

    // Is a given variable an object?
    _.isObject = function(obj) {
      var type = typeof obj;
      return type === 'function' || type === 'object' && !!obj;
    };

    // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
    _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
      _['is' + name] = function(obj) {
        return toString.call(obj) === '[object ' + name + ']';
      };
    });

    // Define a fallback version of the method in browsers (ahem, IE < 9), where
    // there isn't any inspectable "Arguments" type.
    if (!_.isArguments(arguments)) {
      _.isArguments = function(obj) {
        return _.has(obj, 'callee');
      };
    }

    // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
    // IE 11 (#1621), and in Safari 8 (#1929).
    if (typeof /./ != 'function' && typeof Int8Array != 'object') {
      _.isFunction = function(obj) {
        return typeof obj == 'function' || false;
      };
    }

    // Is a given object a finite number?
    _.isFinite = function(obj) {
      return isFinite(obj) && !isNaN(parseFloat(obj));
    };

    // Is the given value `NaN`? (NaN is the only number which does not equal itself).
    _.isNaN = function(obj) {
      return _.isNumber(obj) && obj !== +obj;
    };

    // Is a given value a boolean?
    _.isBoolean = function(obj) {
      return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
    };

    // Is a given value equal to null?
    _.isNull = function(obj) {
      return obj === null;
    };

    // Is a given variable undefined?
    _.isUndefined = function(obj) {
      return obj === void 0;
    };

    // Shortcut function for checking if an object has a given property directly
    // on itself (in other words, not on a prototype).
    _.has = function(obj, key) {
      return obj != null && hasOwnProperty.call(obj, key);
    };

    // Utility Functions
    // -----------------

    // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
    // previous owner. Returns a reference to the Underscore object.
    _.noConflict = function() {
      root._ = previousUnderscore;
      return this;
    };

    // Keep the identity function around for default iteratees.
    _.identity = function(value) {
      return value;
    };

    // Predicate-generating functions. Often useful outside of Underscore.
    _.constant = function(value) {
      return function() {
        return value;
      };
    };

    _.noop = function(){};

    _.property = function(key) {
      return function(obj) {
        return obj == null ? void 0 : obj[key];
      };
    };

    // Generates a function for a given object that returns a given property.
    _.propertyOf = function(obj) {
      return obj == null ? function(){} : function(key) {
        return obj[key];
      };
    };

    // Returns a predicate for checking whether an object has a given set of
    // `key:value` pairs.
    _.matcher = _.matches = function(attrs) {
      attrs = _.extendOwn({}, attrs);
      return function(obj) {
        return _.isMatch(obj, attrs);
      };
    };

    // Run a function **n** times.
    _.times = function(n, iteratee, context) {
      var accum = Array(Math.max(0, n));
      iteratee = optimizeCb(iteratee, context, 1);
      for (var i = 0; i < n; i++) accum[i] = iteratee(i);
      return accum;
    };

    // Return a random integer between min and max (inclusive).
    _.random = function(min, max) {
      if (max == null) {
        max = min;
        min = 0;
      }
      return min + Math.floor(Math.random() * (max - min + 1));
    };

    // A (possibly faster) way to get the current timestamp as an integer.
    _.now = Date.now || function() {
        return new Date().getTime();
      };

    // List of HTML entities for escaping.
    var escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '`': '&#x60;'
    };
    var unescapeMap = _.invert(escapeMap);

    // Functions for escaping and unescaping strings to/from HTML interpolation.
    var createEscaper = function(map) {
      var escaper = function(match) {
        return map[match];
      };
      // Regexes for identifying a key that needs to be escaped
      var source = '(?:' + _.keys(map).join('|') + ')';
      var testRegexp = RegExp(source);
      var replaceRegexp = RegExp(source, 'g');
      return function(string) {
        string = string == null ? '' : '' + string;
        return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
      };
    };
    _.escape = createEscaper(escapeMap);
    _.unescape = createEscaper(unescapeMap);

    // If the value of the named `property` is a function then invoke it with the
    // `object` as context; otherwise, return it.
    _.result = function(object, property, fallback) {
      var value = object == null ? void 0 : object[property];
      if (value === void 0) {
        value = fallback;
      }
      return _.isFunction(value) ? value.call(object) : value;
    };

    // Generate a unique integer id (unique within the entire client session).
    // Useful for temporary DOM ids.
    var idCounter = 0;
    _.uniqueId = function(prefix) {
      var id = ++idCounter + '';
      return prefix ? prefix + id : id;
    };

    // By default, Underscore uses ERB-style template delimiters, change the
    // following template settings to use alternative delimiters.
    _.templateSettings = {
      evaluate    : /<%([\s\S]+?)%>/g,
      interpolate : /<%=([\s\S]+?)%>/g,
      escape      : /<%-([\s\S]+?)%>/g
    };

    // When customizing `templateSettings`, if you don't want to define an
    // interpolation, evaluation or escaping regex, we need one that is
    // guaranteed not to match.
    var noMatch = /(.)^/;

    // Certain characters need to be escaped so that they can be put into a
    // string literal.
    var escapes = {
      "'":      "'",
      '\\':     '\\',
      '\r':     'r',
      '\n':     'n',
      '\u2028': 'u2028',
      '\u2029': 'u2029'
    };

    var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

    var escapeChar = function(match) {
      return '\\' + escapes[match];
    };

    // JavaScript micro-templating, similar to John Resig's implementation.
    // Underscore templating handles arbitrary delimiters, preserves whitespace,
    // and correctly escapes quotes within interpolated code.
    // NB: `oldSettings` only exists for backwards compatibility.
    _.template = function(text, settings, oldSettings) {
      if (!settings && oldSettings) settings = oldSettings;
      settings = _.defaults({}, settings, _.templateSettings);

      // Combine delimiters into one regular expression via alternation.
      var matcher = RegExp([
          (settings.escape || noMatch).source,
          (settings.interpolate || noMatch).source,
          (settings.evaluate || noMatch).source
        ].join('|') + '|$', 'g');

      // Compile the template source, escaping string literals appropriately.
      var index = 0;
      var source = "__p+='";
      text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
        source += text.slice(index, offset).replace(escaper, escapeChar);
        index = offset + match.length;

        if (escape) {
          source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
        } else if (interpolate) {
          source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
        } else if (evaluate) {
          source += "';\n" + evaluate + "\n__p+='";
        }

        // Adobe VMs need the match returned to produce the correct offest.
        return match;
      });
      source += "';\n";

      // If a variable is not specified, place data values in local scope.
      if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

      source = "var __t,__p='',__j=Array.prototype.join," +
        "print=function(){__p+=__j.call(arguments,'');};\n" +
        source + 'return __p;\n';

      try {
        var render = new Function(settings.variable || 'obj', '_', source);
      } catch (e) {
        e.source = source;
        throw e;
      }

      var template = function(data) {
        return render.call(this, data, _);
      };

      // Provide the compiled source as a convenience for precompilation.
      var argument = settings.variable || 'obj';
      template.source = 'function(' + argument + '){\n' + source + '}';

      return template;
    };

    // Add a "chain" function. Start chaining a wrapped Underscore object.
    _.chain = function(obj) {
      var instance = _(obj);
      instance._chain = true;
      return instance;
    };

    // OOP
    // ---------------
    // If Underscore is called as a function, it returns a wrapped object that
    // can be used OO-style. This wrapper holds altered versions of all the
    // underscore functions. Wrapped objects may be chained.

    // Helper function to continue chaining intermediate results.
    var result = function(instance, obj) {
      return instance._chain ? _(obj).chain() : obj;
    };

    // Add your own custom functions to the Underscore object.
    _.mixin = function(obj) {
      _.each(_.functions(obj), function(name) {
        var func = _[name] = obj[name];
        _.prototype[name] = function() {
          var args = [this._wrapped];
          push.apply(args, arguments);
          return result(this, func.apply(_, args));
        };
      });
    };

    // Add all of the Underscore functions to the wrapper object.
    _.mixin(_);

    // Add all mutator Array functions to the wrapper.
    _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
      var method = ArrayProto[name];
      _.prototype[name] = function() {
        var obj = this._wrapped;
        method.apply(obj, arguments);
        if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
        return result(this, obj);
      };
    });

    // Add all accessor Array functions to the wrapper.
    _.each(['concat', 'join', 'slice'], function(name) {
      var method = ArrayProto[name];
      _.prototype[name] = function() {
        return result(this, method.apply(this._wrapped, arguments));
      };
    });

    // Extracts the result from a wrapped and chained object.
    _.prototype.value = function() {
      return this._wrapped;
    };

    // Provide unwrapping proxy for some methods used in engine operations
    // such as arithmetic and JSON stringification.
    _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

    _.prototype.toString = function() {
      return '' + this._wrapped;
    };

    // AMD registration happens at the end for compatibility with AMD loaders
    // that may not enforce next-turn semantics on modules. Even though general
    // practice for AMD registration is to be anonymous, underscore registers
    // as a named module because, like jQuery, it is a base library that is
    // popular enough to be bundled in a third party lib, but not be part of
    // an AMD load request. Those cases could generate an error when an
    // anonymous define() is called outside of a loader request.
    if (typeof define === 'function' && define.amd) {
      define('underscore', [], function() {
        return _;
      });
    }
  }.call(this));

},{}]},{},[1]);


//end  module;

//this is partial file which define the end of closure
})(window || module.exports);

