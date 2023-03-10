import { ComparePositions } from "./ComparePositions.js"
import { ScoreBoard } from "./ScoreBoard.js"

const MIN_ACCURACY = 0.5;
let comparePositions = new ComparePositions(MIN_ACCURACY);

let videoCam = document.getElementById('videoCam');
let canvasCam;// = document.getElementById('outputCam');
let ctxCam;// = canvasCam.getContext('2d');
let videoInstrct = document.getElementById("videoInstrct");
let sourceVideo = document.getElementById("source");
let camWrapper = document.getElementById("camWrapper");
let instructions = document.getElementById("instructions");
var started = false;

let posesCam, posesVid, currentResult;

let detector, model;
const scoreThreshold = 0.6;
var count = 0;

async function createDetector() {
    model = poseDetection.SupportedModels.BlazePose;
    const detectorConfig = {
        runtime: "tfjs",
        enableSmoothing: true,
        modelType: "heavy"
    };
    detector = await poseDetection.createDetector(model, detectorConfig);
}

async function activateVideoCam() {
    console.log(camWrapper);
    if(navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({'video': {
            width: '640',
            height: '480'
        }}).then(stream => {
                videoCam.srcObject = stream;
            })
            .catch(() => {
                console.log("Error occurred while getting the webcam stream");
            });
    }

    videoCam.onloadedmetadata = () => {
        const videoWidth = videoCam.videoWidth;
        const videoHeight = videoCam.videoHeight;
        videoCam.setAttribute("width", videoWidth);
        videoCam.setAttribute("height", videoHeight);

        videoCam.width = videoWidth;
        videoCam.height = videoHeight;
        canvasCam.width = 640;//videoWidth;
        canvasCam.height = 480;//videoHeight;
        
        ctxCam.translate(videoWidth, 0);
        ctxCam.scale(-1, 1);
    };

    videoCam.addEventListener("loadeddata", predictCamPoses);
}

async function predictCamPoses() {
    let poses = null;
    
    if (detector != null) {
        try {
            poses = await detector.estimatePoses(videoCam, {
                flipHorizontal: false 
            });
        } catch (error) {
            detector.dispose();
            detector = null;
            window.location.reload();
        }
        posesCam = poses;
    }

    ctxCam.drawImage(videoCam, 0, 0, videoCam.videoWidth, videoCam.videoHeight);

    if (poses && poses.length > 0) {
        for (const pose of poses) {
            if (pose.keypoints != null) {
                drawKeypointsCam(pose.keypoints);
                drawSkeletonCam(pose.keypoints);
            }
        }
    }

    window.requestAnimationFrame(predictCamPoses);
}

function drawKeypointsCam(keypoints) {
    ctxCam.fillStyle = 'Green';
    ctxCam.strokeStyle = 'White';
    ctxCam.lineWidth = 2;
    for(let i=0; i<keypoints.length; i++) {
        drawKeypointCam(keypoints[i]);
    }
}

function drawKeypointCam(keypoint) {
    const keyName = keypoint["name"];
    if (currentResult !== undefined && keyName in currentResult) {
        var red = currentResult[keyName] * 255;
        var green = 255 - red;
        ctxCam.fillStyle = "rgba(" + red + ", " + green + ", " + " 20, 0.7)";
        ctxCam.strokeStyle = "rgba(" + red + ", " + green + ", " + " 20, 0.7)";
        ctxCam.lineWidth = 5;
        
        const radius = 4;
        if (keypoint.score >= scoreThreshold) {
            const circle = new Path2D();
            circle.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI);
            ctxCam.fill(circle);
            ctxCam.stroke(circle);
        }
    }
    
}

function drawSkeletonCam(keypoints) {
    const color = "#fff";
    ctxCam.fillStyle = color;
    ctxCam.strokeStyle = color;
    ctxCam.lineWidth = 2;
    var innerCount = 0;

    poseDetection.util.getAdjacentPairs(model)
        .forEach(([i, j]) => {
            const kp1 = keypoints[i];
            const kp2 = keypoints[j];
            const keyName1 = kp1["name"];
            const keyName2 = kp2["name"];
            if (currentResult !== undefined && keyName1 in currentResult && keyName2 in currentResult) {
                var red = (currentResult[keyName1] + currentResult[keyName2]) * (255 / 2);
                var green = 255 - red;
                ctxCam.fillStyle = "rgba(" + red + ", " + green + ", " + " 20, 0.7)";
                ctxCam.strokeStyle = "rgba(" + red + ", " + green + ", " + " 20, 0.7)";
                ctxCam.lineWidth = 5;
                if (kp1.score >= scoreThreshold && kp2.score >= scoreThreshold) {
                    ctxCam.beginPath();
                    ctxCam.moveTo(kp1.x, kp1.y);
                    ctxCam.lineTo(kp2.x, kp2.y);
                    ctxCam.stroke();
                    if (innerCount == 0) {
                        comparePositions.calculateScore();
                        let score = comparePositions.getScore();
                        count += 1;
                        if (count % 15 == 0) {
                            const scoreElement = document.getElementById("score");
                            let g = score * (255 / 100);
                            let r = 255 - g;
                            scoreElement.innerHTML = "Score: " + Math.floor(score);
                            scoreElement.style.backgroundColor = "rgba(" + r + ", " + g + ", 100, 0.7)"
                        }
                    }
                    innerCount += 1;
                }
            }            
    });
}


























//-----------------------------------------------//
//--- Instructor video model and canvas stuff ---//
//-----------------------------------------------//



async function activateVideoInstrct(name) {
    videoInstrct.pause();
    var src = "TestVideos/" + name;
    sourceVideo.src = src;
    videoInstrct.load();
    videoInstrct.play();

    videoInstrct.width = 640;
    videoInstrct.height = 360;
    videoInstrct.addEventListener("playing", predictInstrctPoses);
}

async function activateSetVideoInstrct() {
    video.pause();
    source.setAttribute("src", "TestVideos/Yoga1.mp4");
    videoInstrct.load();
    videoInstrct.play();

    videoInstrct.width = 640;
    videoInstrct.height = 360;
    videoInstrct.addEventListener("playing", predictInstrctPoses);
}


async function predictInstrctPoses() {
    let poses = null;

    if (detector != null) {
        try {
            poses = await detector.estimatePoses(videoInstrct, {
                flipHorizontal: false
            });
        } catch (error) {
            detector.dispose();
            detector = null;
            window.location.reload();
        }
        posesVid = poses;

        if (posesVid !== undefined && posesVid != null && posesCam !== undefined && posesCam != null) {
            if (posesVid.length > 0 && posesCam.length > 0) {
                currentResult = comparePositions.next(posesVid[0], posesCam[0]);
            }
        }

        
    }
    window.requestAnimationFrame(predictInstrctPoses);
}


document.getElementById("videoButton1").onclick = function() {
    comparePositions.resetScore();
    startVideo("Yoga1.mp4");
}

document.getElementById("videoButton2").onclick = function() {
    comparePositions.resetScore();
    startVideo("Yoga2.mp4");
}
document.getElementById("videoButton3").onclick = function() {
    comparePositions.resetScore();
    startVideo("Yoga3.mp4");
}
document.getElementById("videoButton4").onclick = function() {
    comparePositions.resetScore();
    startVideo("Yoga4.mp4");
}
document.getElementById("videoButton5").onclick = function() {
    comparePositions.resetScore();
    startVideo("Yoga5.mp4");
}
document.getElementById("videoButton6").onclick = function() {
    comparePositions.resetScore();
    startVideo("Yoga6.mp4");
}
document.getElementById("videoButton7").onclick = function() {
    comparePositions.resetScore();
    startVideo("Yoga7.mp4");
}

document.getElementById("scoreView").onclick = function() {
    ScoreBoard.scoresAlert();
}

document.getElementById("scoreSave").onclick = function() {
    let fileName = document.getElementById("source").getAttribute("src");
    let score = comparePositions.getScore();
    ScoreBoard.addScore(fileName, Math.round(score));
}

document.getElementById("scoreClear").onclick = function() {
    ScoreBoard.clearScores();
}





var myFile = document.getElementById("myFile");

async function combine(event) {
    if (started == false) {
        console.log("canvas creation");
        instructions.remove();
        canvasCam = document.createElement("canvas");
        canvasCam.setAttribute('id', 'outputCam');
        camWrapper.appendChild(canvasCam);
        canvasCam = document.getElementById('outputCam');
        ctxCam = canvasCam.getContext('2d');
    }
    started = true;
    
    if (event.target.files && event.target.files[0]) {
        await createDetector();
        await activateVideoCam();
        await activateVideoInstrct(event.target.files[0].name);
    }
}


myFile.addEventListener('change', combine);


async function startVideo(name) {
    if (started == false) {
        console.log("canvas creation");
        instructions.remove();
        canvasCam = document.createElement("canvas");
        canvasCam.setAttribute('id', 'outputCam');
        camWrapper.appendChild(canvasCam);
        canvasCam = document.getElementById('outputCam');
        ctxCam = canvasCam.getContext('2d');
        await createDetector();
        await activateVideoCam();
    }
    started = true;
    await activateVideoInstrct(name);
}