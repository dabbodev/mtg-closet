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

async function main() { 
    await startCamera()
    do {
        
        await onCameraReady()
            while (streamStarted) {
                let begin = Date.now()
                await processVideo()
                let delay = 1000/FPS - (Date.now() - begin)
                await new Promise(r => setTimeout(r, delay))
            }
    } while(!streamStarted)
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
    

    await new Promise(r => setTimeout(r, 5000))
    
    return
}

async function onCameraReady() {
    canvas.width = video.width
    canvas.height = video.height
    cap = new cv.VideoCapture(video)
    frame = new cv.Mat(video.height, video.width, cv.CV_8UC4)
    streamStarted = true

    return
}

async function processVideo() {
    try {
        // start processing.
        await cap.read(frame)

        await detector.detectCards(frame)

    } catch (err) {
        frame.delete()
        streamStarted = false
        console.log(err)
    }
    return
}