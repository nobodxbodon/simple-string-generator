function GenCtrl($scope) {

    var worker = new Worker("worker.js");
    worker.onmessage = function(event) {
        var message = event.data;
        console.log(message);
        if (message.indexOf('seed') == 0) {
            $scope.seed = JSON.parse(message.substring(4));
            $scope.seedArray = Object.keys($scope.seed);
        } else if (message.indexOf('known') == 0) {
            $scope.known = JSON.parse(message.substring(5));
        } else
            feedback(message);
    };
    $scope.reset = function() {
        $scope.messages = [];
        $scope.seed = {'1': true};
        $scope.seedArray = Object.keys($scope.seed);
        $scope.known = {};//inputs have seen, with mapped value as expectation {func,expected,result,error}

        for (var i in $scope.seed) {
            $scope.known[i] = {func: null};
        }

        $scope.stopAll = false;
        worker.postMessage("reset");
    };

    $scope.reset();
    $scope.playNum = 0;
    $scope.LIMIT = 100;


    $scope.start = function() {
        worker.postMessage("start" + JSON.stringify({seed: $scope.seed, limit: $scope.LIMIT}));
    };

    $scope.stop = function() {
        worker.postMessage("stop all");
    };

    $scope.dummy = function() {
    };

    var feeds = 0;
    function feedback(str) {
        $scope.messages.push((feeds++) + " " + str);
    }

}

