var fs = require('fs');
var path = require("path");
var async = require('async');
var child_process = require('child_process');
var lei = require('lei-stream');

var root = "/Users/caicai/Downloads/ReactiveCocoa-master";//项目的根目录
var outpuFile = "uml.puml";//输出文件名
outpuFile = path.join(root,outpuFile);
var allfiles = [];
var inherits = {};//继承关系表 类名称：类名称
var presents = {};//跳转关系
var pushs = {};
var implementations = [];//主要类
var interfaces = [];//接口
var complys = {};//实现关系
var ignoreInheritMaxCount = 1000;//如有大于 ignoreInheritMaxCount 个子类继承同一个父类，忽略继承关系。保持UML美观
var ignoreComplyMaxCount = 1000;//如有大于 ignoreInheritMaxCount 个类遵守同一个协议，忽略遵守关系。保持UML美观

readDirSync(root,allfiles);

var codeFiles = allfiles.filter(function (value, index, arr) {
    return value.endsWith('.h')||value.endsWith('.m')//过滤出所有.m .h 文件（此处用于OC，其他语言需要替换）
});

analysisAll(codeFiles,function () {
    outputPlantUml();
});

function readDirSync(path,allfiles){
    var pa = fs.readdirSync(path);
    for (var i=0;i<pa.length;i++){
        var ele = pa[i];
        var info = fs.statSync(path+"/"+ele);
        if(info.isDirectory()){
            readDirSync(path+"/"+ele,allfiles);
        }else{
            allfiles.push(path+"/"+ele);
        }
    }
}

function addInterface(interface) {
    if (!interfaces.includes(interface)) {
        interfaces.push(interface);
    }
}

function addComply(imp, intf) {
    if (!complys[imp]) {
        complys[imp] = [];
    }
    var ints = complys[imp];
    if (!ints.includes(intf)) {
        ints.push(intf);
    }
}

function analysisAll(files,cb) {
    async.eachLimit(files,10,function (item,cb) {
        analysis(item,function (err) {
            cb(err);
        });
    },function (err) {
        // console.log(err);
        // console.log(implementations,inherits);
        var allControllers = implementations.filter(function (value) {
            var superC = inherits[value];
            while (superC != null){
                if (superC == 'UIViewController'){
                    return true;
                }
                superC = inherits[superC];
            }
            return false;
        });
        cb();

    });
}

function analysis(file,cb) {
    // console.log(file);
    var s = lei.readLine(fs.createReadStream(file), {
        newline: '\n',
        autoNext: false
    });
    var localValues = {};
    var localImplementation = [];
    var localPresents = [];
    var localPushs = [];
    s.on('data', function (data) {
        regExp = /@implementation[\s]*([\w]*)/g; //使用g选项
        res = regExp .exec(data);
        if (res) {
            implementations.push(res[1]);
            localImplementation.push(res[1]);
        }

        regExp = /@interface[\s]*([\w]*)[\s]*:[\s]*([\w]*)[\s]*(<[\s]*([\S]*)[\s]*>)?/g; //使用g选项
        res = regExp .exec(data);
        if (res) {
            inherits[res[1]] = res[2];

            var interfaceString = res[4];
            if(interfaceString){
                interfaceString = interfaceString.replace(/[\s]*/g,'');
                var ifArr = interfaceString.split(',');
                for (i = 0; i < ifArr.length; i++) {
                    addInterface(ifArr[i]);
                    addComply(res[1],ifArr[i]);
                }
            }
        }

        regExp = /@interface[\s]*([\w]*)[\s]*\([\s]*\)[\s]*(<[\s]*([\S]*)[\s]*>)?/g;
        res = regExp.exec(data);
        if (res) {
            var interfaceString = res[3];
            if(interfaceString){
                interfaceString = interfaceString.replace(/[\s]*/g,'');
                var ifArr = interfaceString.split(',');
                for (i = 0; i < ifArr.length; i++) {
                    addInterface(ifArr[i]);
                    addComply(res[1],ifArr[i]);
                }
            }
        }

        regExp = /[\s]*([\w]*)[\s]*\*[\s]*([\w]*)/g; //使用g选项
        res = regExp .exec(data);
        if (res) {
            if (res.length>2 && res[1].length>0 && res[2].length>0) {
                localValues[res[2]] = res[1];
            }
        }

        regExp = /[\s]*([\S]*)[\s]*presentViewController[\s]*:[\s]*([\w]*)[\s]*animated[\s]*:[\s]*([\w]*)[\s]*completion[\s]*:/g; //使用g选项
        res = regExp .exec(data);
        if (res) {
            localPresents.push(localValues[res[2]]);
        }

        regExp = /[\s]*([\S]*)[\s]*pushViewController[\s]*:[\s]*([\w]*)[\s]*animated[\s]*:[\s]*([\w]*)[\s]*/g; //使用g选项
        res = regExp .exec(data);
        if (res) {
            localPushs.push(localValues[res[2]]);
        }

        s.next();
    });
    s.on('end', function() {
        // console.log('end');
        cb();
        if (localImplementation.length && localPresents.length){
            if (localPresents.length){
                presents[localImplementation[localImplementation.length-1]]=localPresents;
            }
            if (localPushs.length){
                pushs[localImplementation[localImplementation.length-1]]=localPushs;
            }
        }
    });
    s.on('error', function(err) {
        console.error(err);
        cb(err);
    });
}

function outputPlantUml() {
    var counter = [];
    for (var name in inherits){
        var value = inherits[name];
        if (counter[value]){
            counter[value] = counter[value]+1;
        } else {
            counter[value] = 1;
        }
    }

    var complyCounter = [];
    for (var name in complys){
        var arr = complys[name];
        for (var i = 0; i < arr.length; i++) {
            var value = arr[i];
            if (complyCounter[value]) {
                complyCounter[value] = complyCounter[value] + 1;
            } else {
                complyCounter[value] = 1;
            }
        }
    }

    //写文件
    var w = lei.writeLine(fs.createWriteStream(outpuFile), {
        // 换行符，默认\n
        newline: '\n',
        // 缓存的行数，默认为0（表示不缓存），此选项主要用于优化写文件性能，写入的内容会先存储到缓存中，当内容超过指定数量时再一次性写入到流中，可以提高写速度
        cacheLines: 0
    });

    console.log('@startuml');
    w.write('@startuml');
    console.log();
    w.write('');

    var showClasses = [];//记录需要显示的class
    for (var name in inherits){
        var value = inherits[name];
        if (value == "NSObject"){
            continue;
        }
        if (value == "UIView"){
            continue;
        }
        if (counter[value] > ignoreInheritMaxCount){
            continue;
        }
        console.log(name+" -up--|> "+value);
        w.write(name+" -up--|> "+value);
        if (!showClasses.includes(name)) {
            showClasses.push(name);
        }
        if (!showClasses.includes(value)) {
            showClasses.push(value);
        }
    }
    console.log();
    w.write('');

    console.log();
    w.write('');
    for (var i = 0; i < showClasses.length; i++) {
        var intf = showClasses[i];
        console.log('class '+intf);
        w.write('class '+intf);
    }
    console.log();
    w.write('');

    var showInterface = [];//记录要显示的接口
    for (var name in complys) {
        var arr = complys[name];
        for (var i = 0; i < arr.length; i++) {
            var intf = arr[i];
            if (complyCounter[intf] > ignoreComplyMaxCount){
                continue;
            }
            console.log(name+" .down..|> "+intf);
            w.write(name+" .down..|> "+intf);
            if (!showInterface.includes(intf)) {
                showInterface.push(intf);
            }
        }
    }
    console.log();
    w.write('');
    for (var i = 0; i < showInterface.length; i++) {
        var intf = showInterface[i];
        console.log('interface '+intf);
        w.write('interface '+intf);
    }
    console.log();
    w.write('');

    console.log('@enduml');
    w.write('@enduml');

    child_process.exec("java -jar plantuml.jar "+outpuFile+" -tsvg",function (error, stdout, stderr) {

    });
}