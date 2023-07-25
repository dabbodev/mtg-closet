const video = document.querySelector('video')
const canvas = document.querySelector('#canvasOutput')
const cardcanvas = document.querySelector('#snapOutput')
const FPS = 30;

const { createWorker } = Tesseract

let streamStarted = false
let videoSettings = []

let worker

let trackWindow = null
let trackBox = null;
let cardDetected = false
let cardProcessed = false

let tracker
let dst
let snap
let lostCount = 0
let detCount = 0

let src
let cap
let frame

async function main() {
    worker = await createWorker()
    await worker.loadLanguage('eng')
    await worker.initialize('eng')

    await startCamera()
    await onCameraReady()
    while (true) {
      await processVideo()
    }
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
    streamStarted = true

    tracker = new cv.TrackerMIL()
    dst = new cv.Mat()
    snap = new cv.Mat()

    await new Promise(r => setTimeout(r, 5000))
    
    return
}

async function onCameraReady() {
    canvas.width = video.width
    canvas.height = video.height
    src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    cap = new cv.VideoCapture(video);

    frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    await cap.read(frame);

    return
}

async function runFilters(img) {
    let filters = new cv.Mat()
    

    //filters = await applyBrightness(filters, 40)
    //await cv.addWeighted(filter, 1, filters, 0.10, 0, filters)
    filters = await applyContrast(img, 25)
    

    await cv.medianBlur(filters, filters, 5)

    await cv.cvtColor(filters, filters, cv.COLOR_BGR2GRAY)

    //filters = await applyBrightness(filters, 50)

    //await cv.Canny(filters, filters, 10, 100, 3, false)

    await cv.adaptiveThreshold(filters, filters, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY_INV, 13, 16)
/*
    let M = cv.Mat.ones(3, 3, cv.CV_8U)
    //await cv.erode(filters, filters, M)
    await cv.dilate(filters, filters, M)
    await cv.dilate(filters, filters, M)
    M = cv.Mat.ones(5, 5, cv.CV_8U)
    //await cv.erode(filters, filters, M)
    */
    return filters
}

async function applyBrightness(img, brightness) {
    let shadow = brightness
    let highlight = 255
    if (brightness < 0) {
      shadow = 0
      hightlight = 255 + brightness
    }

    let alpha = (highlight - shadow)/255
    let gamma = shadow

    let result = new cv.Mat()
    await cv.addWeighted(img, alpha, img, 0, gamma, result)
    return result
}

async function applyContrast(img, contrast) {
    let alpha = 131 * (contrast + 127)/(127 * (131 - contrast))
    let gamma = 127*(1 - alpha)

    let result = new cv.Mat()
    await cv.addWeighted(img, alpha, img, 0, gamma, result)
    return result
}

async function processCard() {
    let titleRect = {x: 0, y:10, width:450, height: 100}
    let title = snap.roi(titleRect)

    title = await applyBrightness(title, 40)
    //await cv.addWeighted(title, 1, title, 0.15, 0, title)

    title = await applyContrast(title, 20)
    title = await applyContrast(title, 10)

    await cv.cvtColor(title, title, cv.COLOR_BGR2GRAY)
    
    //title = await applyContrast(title, 10)

    await cv.adaptiveThreshold(title, title, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 3, 4)

    await cv.medianBlur(title, title, 3)

    let M = cv.Mat.ones(3, 3, cv.CV_8U)
    await cv.erode(title, title, M)

    /*
    //

    await cv.cvtColor(title, title, cv.COLOR_BGR2GRAY)

    await cv.addWeighted(title, 1, title, -0.30, 0, title)

    title = await applyContrast(title, 20)
    title = await applyContrast(title, 10)

    title = await applyBrightness(title, 50)
    */

    //await cv.addWeighted(title, 1, title, -0.20, 18, title)
    //title = await applyContrast(title, 30)

    //title = await applyContrast(title, 10)
    //await cv.addWeighted(title, 1, title, -0.15, 10, title)

    //let dsize = new cv.Size(title.cols*2, title.rows*2);
    //await cv.resize(title, title, dsize, 0, 0, cv.INTER_NEAREST);

    //await cv.addWeighted(title, 1, title, -0.20, 18, title)
    //title = await applyContrast(title, 30)

    //title = await applyContrast(title, 10)

    cv.imshow('snapOutput', title);
    const { data: { text } } = await worker.recognize(cardcanvas.toDataURL("image/png"));
    console.log(text)
    if (text == "") {
      cardDetected = false
    }
    document.querySelector('#cardName').innerHTML = text
    return
}

async function detectCard() {
    let filters = await runFilters(frame)

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    await cv.findContours(filters, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)

    filters.delete()
  
    let largest = 0

    for (i = 1; i < contours.size(); i++) {
      cv.arcLength(contours.get(i), false) > cv.arcLength(contours.get(largest), false) ? largest = i : false
    }

    let cnt = contours.get(largest)

    contours.delete()
    hierarchy.delete()

    let rotatedRect = cv.minAreaRect(cnt)
    rotatedRect.size.height+=5
    rotatedRect.size.width+=5
    let ratio = 0
    rotatedRect.size.width < rotatedRect.size.height ? ratio = rotatedRect.size.width / rotatedRect.size.height : ratio = rotatedRect.size.height / rotatedRect.size.width
    //console.log(ratio)
    if (ratio > 0.68 && ratio < 0.78) {
      cardDetected = true
      trackWindow = cv.boundingRect(cnt)
      trackWindow.x-=20
      trackWindow.y-=20
      trackWindow.width+=40
      trackWindow.height+=40
      trackBox = rotatedRect
      tracker.init(frame, trackWindow)
      lostCount = 0
      
      let vertices = cv.RotatedRect.points(trackBox)

      if (rotatedRect.size.width > rotatedRect.size.height) {
        vertices = [vertices[3],vertices[0],vertices[1],vertices[2]]
      }

      let w = 525
      let h = 700
      let dpts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, h-1, 0, 0, w-1, 0, w-1, h-1])
      let box = cv.matFromArray(4, 1, cv.CV_32FC2, vertices.map((v) => [v.x, v.y]).flat())
      let M = await cv.getPerspectiveTransform(box, dpts)
      let dsize = new cv.Size(w, h);
      await cv.warpPerspective(frame, snap, M, dsize)
      //
    }
    return
}

async function redetectCard() {
           
    let filters = await runFilters(frame.roi(trackWindow))

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    await cv.findContours(filters, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)

    filters.delete()
  
    let largest = 0

    for (i = 1; i < contours.size(); i++) {
      cv.arcLength(contours.get(i), false) > cv.arcLength(contours.get(largest), false) ? largest = i : false
    }

    let cnt = contours.get(largest)

    contours.delete()
    hierarchy.delete()

    let rotatedRect = cv.minAreaRect(cnt)
    rotatedRect.size.height+=5
    rotatedRect.size.width+=5
    let ratio = 0
    rotatedRect.size.width < rotatedRect.size.height ? ratio = rotatedRect.size.width / rotatedRect.size.height : ratio = rotatedRect.size.height / rotatedRect.size.width
    //console.log(ratio)
    if (ratio > 0.68 && ratio < 0.78) {
      trackBox = rotatedRect
      lostCount = 0
    } else {
      lostCount++
      if (lostCount > 10) {
        cardDetected = false
      }
    }
    return
}

async function processVideo() {
    try {
        if (!streamStarted) {
            // clean and stop.
            frame.delete(); dst.delete(); hsvVec.delete(); roiHist.delete(); hsv.delete();
            return;
        }
        while (streamStarted) {
          let begin = Date.now();

          // start processing.
          await cap.read(frame);
          

          if (!cardDetected) {
            cardProcessed = false
            detCount = 0
            await detectCard()
          } 
          
          //let filters = await runFilters(frame)
          if (cardDetected) {
            try {
              trackWindow = await tracker.update(frame)[1]
              if (trackWindow.x + trackWindow.width > video.width || trackWindow.y + trackWindow.height > video.height || trackWindow.x < 0 || trackWindow.y < 0) {
                cardDetected = false
                cardProcessed = false
                detCount = 0
                continue
              } else {
                

                await redetectCard()
                if (!cardDetected) continue
                if (cardDetected) {
                  detCount++
                  let rectangleColor = new cv.Scalar(255, 0, 0)
                  let point1 = new cv.Point(trackWindow.x, trackWindow.y);
                  let point2 = new cv.Point(trackWindow.x + trackWindow.width, trackWindow.y + trackWindow.height);
                  cv.rectangle(frame, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

                  dst = frame.roi(trackWindow)
                  let vertices = cv.RotatedRect.points(trackBox)
                  for (let i = 0; i < 4; i++) {
                      cv.line(dst, vertices[i], vertices[(i + 1) % 4], rectangleColor, 2, cv.LINE_AA, 0);
                  }

                  if (detCount > 15 && !cardProcessed) {
                    processCard()
                    cardProcessed = true
                  }
                }
              }
            } catch (err) {
              cardDetected = false
              cardProcessed = false
              detCount = 0
            }
          }
          cv.imshow('canvasOutput', frame);
          // schedule the next one.
          let delay = 1000/FPS - (Date.now() - begin);
          await new Promise(r => setTimeout(r, delay));
      }

        
        
    } catch (err) {
        console.log(err)
        await processVideo()
    }
    return
}

