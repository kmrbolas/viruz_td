polyFillPerfNow();
injectMeasure();
polyFillRAFNow();
setupLoader();
detectBrowser();

// at this point, we have : 
//   now() with sub-ms accuracy, 
//   requestAnimationFrame(),
//   a stop-watch : startCW(), stopCW(), lastCW().
//   a basic rsc handling : var myImg = addRsc(Image, 'http://...') ;
//         AnyFile can stand for XMLHttpRequest
//   cl is console.log
//   isSafari, isiOS, isOpera, isChrome

// Canvas setup
var cv = document.getElementById('canvas');
var ctx = context = cv.getContext('2d');
var canvasWidth = cv.width,
    canvasHeight = cv.height;

// -----------------------------------------------------
//            Interesting code goes here
// -----------------------------------------------------

// add rsc here if required with : 
//     var myImg = addRsc(Image, 'http://...') ;

var wallImg = addRsc(Image, 'http://www.sxc.hu/assets/8/72973/brick-wall-pattern-3-648913-m.jpg');

var i = 0,
    π = Math.PI;

var wallPat = null;

// main function executed when all is loaded.
function main() {
    wallImg = makeRepeat(wallImg);
    wallPat = ctx.createPattern(wallImg, "repeat");
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    drawScene();
}

function drawScene() {
    // draw the wall
    ctx.fillStyle = wallPat;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    // darken the wall, with a bit of blue
    darken(0, 0, canvasWidth, canvasHeight, '#003', 0.5);
    // draw a light abstacle
    ctx.save();
    ctx.strokeStyle = '#58B';
    ctx.fillStyle = '#46A';
    ctx.beginPath();
    ctx.arc(280, 280, 50, 0, 2 * π);
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();
    // clip with the light obstacle
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvasWidth, 0);
    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.lineTo(0, canvasHeight);
    ctx.lineTo(0, 0);
    ctx.arc(280, 280, 50, 0, 2 * π, true);
    ctx.clip();
    // draw the left light (clipped)
    ligthen(180, 200, 120, '#331');
    ctx.restore();
    // draw left candle
    drawCandle(180, 200);
    // draw right light
    ligthenGradient(460, 200, 120);
    // draw right candle
    drawCandle(460, 200);
}

function ligthen(x, y, radius, color) {
    ctx.save();
    var rnd = 0.03 * Math.sin(1.1 * Date.now() / 1000);
    radius = radius * (1 + rnd);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#0B0B00';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * π);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.90 + rnd, 0, 2 * π);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4 + rnd, 0, 2 * π);
    ctx.fill();
    ctx.restore();
}

function ligthenGradient(x, y, radius) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var rnd = 0.05 * Math.sin(1.1 * Date.now() / 1000);
    radius = radius * (1 + rnd);
    var radialGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    radialGradient.addColorStop(0.0, '#BB9');
    radialGradient.addColorStop(0.2 + rnd, '#AA8');
    radialGradient.addColorStop(0.7 + rnd, '#330');
    radialGradient.addColorStop(0.90, '#110');
    radialGradient.addColorStop(1, '#000');
    ctx.fillStyle = radialGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * π);
    ctx.fill();
    ctx.restore();
}

function darken(x, y, w, h, darkenColor, amount) {
    ctx.fillStyle = darkenColor;
    ctx.globalAlpha = amount;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
}

function drawCandle(x, y) {
    ctx.fillStyle = '#EEE';
    ctx.fillRect(x - 10, y + 20, 20, 50);

    ctx.fillStyle = '#CC8';
    ctx.fillRect(x - 4, y + 4, 8, 12);
    ctx.fillRect(x - 2, y, 4, 4);

    ctx.fillStyle = '#E66';
    ctx.fillRect(x - 2, y + 3 + 4, 4, 6);
}

// make the image repeat by copying
// a mirrored version in x, y, x+y.
//   returns a new Canvas  X2,X2 its size.
function makeRepeat(img) {
    var tmpCv = document.createElement('canvas');
    tmpCv.width = img.width * 2;
    tmpCv.height = img.height * 2;
    var tmpCtx = tmpCv.getContext('2d');
    tmpCtx.drawImage(img, 0, 0);
    tmpCtx.save();
    tmpCtx.translate(2 * img.width, 0);
    tmpCtx.scale(-1, 1);
    tmpCtx.drawImage(img, 0, 0);
    tmpCtx.translate(0, 2 * img.height);
    tmpCtx.scale(1, -1);
    tmpCtx.drawImage(img, 0, 0);
    tmpCtx.restore();
    tmpCtx.save();
    tmpCtx.translate(0, 2 * img.height);
    tmpCtx.scale(1, -1);
    tmpCtx.drawImage(img, 0, 0);
    tmpCtx.restore();
    return tmpCv;
}

// -----------------------------------------------------
//          ///  Interesting code ends here
// -----------------------------------------------------

// performance.now polyfill
// measure time with now()
function polyFillPerfNow() {
    window.performance = window.performance ? window.performance : {};
    window.performance.now = window.performance.now || window.performance.webkitNow || window.performance.msNow || window.performance.mozNow || Date.now;
    window.now = window.performance.now.bind(performance);
    // warm up the function, fooling the interpreter not to skip;
    var a = now();
    a += now();
    return a;
};

// ! requires (window.)now() to be defined. 
// inject startCW() and stopCW() to get a stop watch using
// performace.now. call with a factor to use another unit 
//   (1e3 -> ns ; 1e-3 -> s )
// use with :
//   startCW();
//   // ... the thing i want to measure
//   stopCW();  
//   console.log(lastCW());
// or you can store in a var the result of stopCW(), but do not
// use console.log(stopCW()); for consistant results.
function injectMeasure(factor) {
    var startTime = 0;
    var stopTime = 0;
    factor = factor | 1;

    window.startCW = function () {
        startTime = now();
        return startTime;
    };
    window.stopCW = function () {
        stopTime = now();
        return factor * (stopTime - startTime);
    };
    window.lastCW = function () {
        return factor * (stopTime - startTime);
    };
    // warming up the functions, 
    // fooling the interpreter not to skip;
    var w = 0;
    w = startCW();
    w += startCW();
    w += stopCW();
    w += stopCW();
    w += lastCW();
    return w;
}

function polyFillRAFNow() {
    // requestAnimationFrame polyfill
    var w = window,
        foundRequestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame || w.oRequestAnimationFrame || function (cb) {
            setTimeout(cb, 1000 / 60);
        };
    window.requestAnimationFrame = foundRequestAnimationFrame;
    // warm-up the function
    requestAnimationFrame(voidFunction);
}

function voidFunction() {};

// resources loader
function setupLoader() {

    window.AnyFile = XMLHttpRequest;

    var rscCount = 1;
    var errorCount = 0;
    var errMsgs = '';

    window.addRsc = function (rscType, rscUrl) {
        var rsc = new rscType();
        rscCount++;
        rsc.addEventListener('load', loadEnded);
        rsc.addEventListener('error', errorWhileLoading);
        if (rscType !== AnyFile) rsc.src = rscUrl;
        else {
            rsc.open("GET", rscUrl, true);
            rsc.send(null);
        }
        return rsc;
    }
    window.addEventListener('load', loadEnded);
    window.addEventListener('error', errorWhileLoading);

    function loadEnded() {
        cl('l ed ');
        rscCount--;
        if (!rscCount) launchMain();
    }

    function errorWhileLoading(e) {
        errorCount++;
        rscCount--;
        errMsgs += e.message + '\n';
        if (!rscCount) launchMain();
    }

    function launchMain() {
        if (errorCount) alert('errors while loading rsc : \n' + errMsgs);
        setTimeout(main, 1000);
    }
}

function cl() {
    console.log.apply(console, arguments);
}

function length(x1, y1, x2, y2) {
    y2 -= y1;
    y2 *= y2;
    x2 -= x1;
    x2 *= x2;
    return Math.sqrt(x2 + y2)
}

function detectBrowser() {

    window.isOpera = !! window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
    window.isFirefox = typeof InstallTrigger !== 'undefined'; // Firefox 1.0+
    var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
    window.isChrome = !! window.chrome && !isOpera; // Chrome 1+
    window.isIE = /*@cc_on!@*/
    false || document.documentMode;

    var uagent = navigator.userAgent.toLowerCase();
    window.isiOS = (uagent.search("iphone") > -1 || uagent.search("ipod") > -1 || uagent.search("ipad") > -1 || uagent.search("appletv") > -1);

    var transform = null;
    if (isSafari || isChrome || isiOS) transform = 'webkitTransform';
    if (isOpera) transform = 'OTransform';
    if (isFirefox) transform = 'MozTransform';

    window.transform = transform;
}

function sq(x) {
    return x * x;
}