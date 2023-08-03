const { createWorker } = Tesseract

const video = document.querySelector('video')
const canvas = document.querySelector('#canvasOutput')
const cardcanvas = document.querySelector('#snapOutput')
const FPS = 24

let streamStarted = false
let videoSettings = []

let trackWindow = null
let trackBox = null;
let cardDetected = false
let cardProcessed = false

let tracker
let dst
let snap

let cap
let frame

let detector = new CardDetector()
let processor = new CardProcessor()

var brightmod = 0
var contmod = 0

function decreaseBrightness() {
    if (brightmod > -100) brightmod-=5
    document.querySelector('#brightmod').innerHTML = brightmod
}

function increaseBrightness() {
    if (brightmod < 100) brightmod+=5
    document.querySelector('#brightmod').innerHTML = brightmod
}

function decreaseContrast() {
    if (contmod > -100) contmod-=1
    document.querySelector('#contmod').innerHTML = contmod
}

function increaseContrast() {
    if (contmod < 100) contmod+=1
    document.querySelector('#contmod').innerHTML = contmod
}

async function main() { 
    await startCamera()
    do {
        try {
            await onCameraReady()
        } catch (e) {
            //console.log(e)
        }
            while (streamStarted) {
                try {
                    let begin = Date.now()
                    await processVideo()
                    let delay = 1000/FPS - (Date.now() - begin)
                    await new Promise(r => setTimeout(r, delay))
                } catch (e) {
                    console.log(e)
                }
            }
    } while(!streamStarted)
    return
}

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: {
                ideal: 'environment'
            }
        }})

    videoSettings = stream.getVideoTracks()[0].getSettings()
    video.height = videoSettings.height
    video.width = videoSettings.width
    video.srcObject = stream
    cap = new cv.VideoCapture(video)
    

    canvas.width = video.width
    canvas.height = video.height

    await new Promise(r => setTimeout(r, 5000))
    
    return
}

async function onCameraReady() {
    streamStarted = true
    //if (frame) frame.delete()
    frame = new cv.Mat(video.height, video.width, cv.CV_8UC4)
    

    return
}

async function processVideo() {
    try {
        // start processing.
        await cap.read(frame)

        await detector.detectCards(frame)

    } catch (err) {
        //cap.release()
        //frame.delete()
        streamStarted = false
        //console.log(err)
    }
    return
}