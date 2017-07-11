(function() {
'use strict';

  angular
  .module('sync')
  .controller('syncController', ['$rootScope', '$scope', '$state', '$sessionStorage', 'syncService',
  function ($rootScope, $scope, $state, $sessionStorage, syncService){

    console.log("Module sync loaded");

    var datasetId = "SyncData";

    $fh.sync.init({
      "do_console_log" : false,
      "storage_strategy" : "dom"
    });

    $fh.sync.manage(datasetId);

    $fh.sync.notify(function(notification) {
      console.log("Sync Notification: " + notification.code);

      if( 'sync_complete' == notification.code ) {
        console.log("Sync Complete");
        $fh.sync.doList(datasetId,
          function(res){

            var dataList = [];
            //res is a JSON object
            for(var key in res){
              if(res.hasOwnProperty(key)){
                // Unique Id of the record, used for read, update & delete operations (string).
                var uid = key;
                // Record data, opaque to sync service.
                var data = res[key].data;
                data.uid = uid;

                //$scope.syncData.push(data);
                dataList.push(data);

                // Unique hash value for this record
                var hash = res[key].hash;
              }
            }

            // Make data available to other controllers
            syncService.putData(dataList);
            // Announce new data is available to other controllers
            $rootScope.$broadcast('sync');

          },
          function(code, msg){
            console.log("error: " + code + ' : ' + msg);
          }
        );
      } else if( 'local_update_applied' === notification.code ) {

      } else if( 'remote_update_failed' === notification.code ) {
        console.log("Sync Error: " + notification.message);
      }
    });


    // Create initial persistent document in the managed dataset (for demo purpose only)
    var item = { name: 'item1', icon: 'img/ic_chat_24px.svg', what: 'what1', notes: 'notes1' };

    $fh.sync.doCreate(datasetId, item, function(res) {
      // The update record which will be sent to the cloud
      console.log(res);
    }, function(code, msg) {
      // Error code. One of 'unknown_dataset' or 'unknown_id'
      console.error(code);
      // Optional free text message with additional information
      console.error(msg);
    });


  }]);
})();
