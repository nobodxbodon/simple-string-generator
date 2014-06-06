var $scope = {};

function reset() {
    $scope.seed = {'1': true};
    $scope.seedArray = Object.keys($scope.seed);
    $scope.num = 0;
    $scope.functions = [compareByString];
    $scope.known = {};//inputs have seen, with mapped value as expectation {func,expected,result,error}
    for (var i in $scope.seed) {
        $scope.known[i] = {func: null};
    }
    $scope.stopAll = false;
    $scope.playNum = 0;
}
var timeout = 0;
var replayThreshhold = 1;   //if there's at least 1 new known, restart playing
var newStarts = 0;

onmessage = function(event) {
    var message = event.data;
    if (message.indexOf('start') == 0) {
        var env = JSON.parse(message.substring(5));
        $scope.seed = env.seed;
        $scope.LIMIT = env.limit;
        $scope.seedArray = Object.keys($scope.seed);
        $scope.startTime = new Date();
        foolAround(Object.keys($scope.seed)[0]);
    } else if (message == "stop all") {
        $scope.stopAll = true;
    } else if (message == "reset") {
        reset();
    }
}

//TODO: use array as input
function foolAround(finput) {
    if ($scope.stopAll)
        return;
    feedback("start fooling with:" + finput);

    //generate based on input
    generateString(finput);
    feedback("# of gen:" + sizeOf($scope.known));
    play(finput);
}

function sizeOf(set) {
    return Object.keys(set).length;
}

function generateString(input) {
    while ($scope.num < $scope.LIMIT) {
        for (var i in $scope.known) {
            addToKnown(input + i);
            addToKnown(i + input);
        }
    }
}

function compareByString(i1, i2) {
    return i1.toString() == i2.toString();
}

function addToKnown(str) {
    //TODO: check result to see if there's new lexicon, if there is, fool more; if input has pattern with known lexicon, play known ones with the pattern
    if ($scope.known[str] == null) {
        feedback($scope.num + " add new:" + str);
        $scope.known[str] = {func: null};
        $scope.num++;
    }
}

//dynamic part
function play() {
    if ($scope.stopAll) {
        $scope.playNum--;
        return;
    }
    $scope.playNum++;
    //go through all the generated
    for (var input in $scope.known) {
        if ($scope.known[input].result != null)
            continue;
        var result = null;
        try {
            result = eval(input);
            feedback(input + "=>" + result, 1);
            //TODO: get an expectation based on the input, if the result is the same, not interesting. Otherwise, remember it
        }
        catch (err) {
            $scope.playNum--;
            feedback(input + "=>" + err + "  allKnown:" + $scope.num, 1)
            $scope.known[input].error = true;
        };
        $scope.known[input].result = result;
    }
    //after eval all, conclude known
    //play and conclude don't happen concurrently. restart playing after concluding
    conclude();

    $scope.playNum--;
}
// generate patterns, reduce knowns; have to include input, as new input can be critical for unsolved
// built in: compare strictly by string
// MUST: if playing, don't enter
function conclude() {
    var newFoundList = [];
    for (var i in $scope.known) {
        var k = $scope.known[i];
        if (k.func == null && k.result != null) {
            for (var j in $scope.functions) {
                if ($scope.functions[j].apply(null, [i, k.result])) {
                    k.func = $scope.functions[j];
                    //seen it, bored, discard
                    feedback("!!!remove:" + i);
                    delete $scope.known[i];
                    $scope.num--;
                    continue;
                }
            }
        }
        //if nothing fits, get the strange things
        if (k != null && k.hasOwnProperty('func') && k.func == null && k.result != null) {
            var diff = diffstring(i, k.result);
            for (var i in diff) {
                if (!(diff[i] in $scope.seed)) {
                    $scope.known[diff[i]] = {func: null, result: null};
                    feedback("known" + JSON.stringify($scope.known));
                    $scope.seed[diff[i]] = true;
                    feedback("seed" + JSON.stringify($scope.seed));
                    $scope.seedArray.push(diff[i]);
                    newFoundList.push(diff[i]);
                    $scope.num++;
                    feedback("playnum:" + $scope.playNum + "\n" + ((new Date()) - $scope.startTime) + "ms\n" + $scope.num + " Adding " + diff[i]);
                }
            }
        }
    }
    //for now only replay after concluding is done, can be whenever find a new thing
    var newFound = newFoundList.length;
    if (newFound >= replayThreshhold) {
        feedback("found new:" + newFound);
        resetCounter();
        for (var i = 0; i < newFound; i++) {
            foolAround(newFoundList[i]);

        }
        feedback(++newStarts + " runs");
    } else {
        $scope.codes = Object.keys($scope.known);
        if ($scope.num >= $scope.LIMIT * 2)
            return;
        else {
            feedback("in conclude:" + $scope.num);
        }
        feedback(((new Date()) - $scope.startTime) + "ms\n" + "Nothing new found! Stop everything. After " + newStarts + " runs");
    }
}

function resetCounter() {
    $scope.stopAll = false;
    $scope.num = 0;
}

// compare two strings, return all charactors different from str1
// TODO: generate pattern of str1->str2 if possible
function diffstring(str1, str2) {
    str1 = str1.toString();
    str2 = str2.toString();
    if (str1 === str2)
        return [];
    else {
        var diff = [];
        var set = {};
        for (var i in str1) {
            set[str1[i]] = true;
        }
        for (var i in str2) {
            if (!(str2[i] in set))
                diff.push(str2[i]);
        }
        return diff;
    }
}

function feedback(str) {
    postMessage(str);
}