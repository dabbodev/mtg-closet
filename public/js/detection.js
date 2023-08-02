class CardDetector {
  constructor() {
    this.cardDetected = false
    this.trackWindow = null
    this.trackBox = null
    this.frame = null

    this.detectedCards = []
  }

  async detectCards(frame) {
    this.frame = frame.clone()
    let filters = await this.runFilters()

    let k = cv.Mat.ones(2, 2, cv.CV_8U)
    await cv.dilate(filters, filters, k)
  
    cv.Canny(filters, filters, 30, 170, 3, true)

    

    //

    let contours = await this.threshContours(filters)
    let hierarchy = new cv.Mat()
    let conout = frame.clone()
    let color = new cv.Scalar(255, 0, 255)

    let found = contours.size() > 0

    let detectedIn = new Array(this.detectedCards.length).fill(false)

    if (found) {
      let alreadyDetected
      
      for (var c = 0; c < contours.size(); c++) {
        let cnt = contours.get(c)
        for (var i = 0; i < this.detectedCards.length; i++) {
          if (await this.detectedCards[i].isWithin(cnt)) {
            alreadyDetected = this.detectedCards[i]
            detectedIn[i] = true
          }
        }
        if (!alreadyDetected) {
          alreadyDetected = this.detectedCards[this.detectedCards.push(new CardTracker(cnt)) - 1]
        } 
      }
    }

    for (var i = 0; i < this.detectedCards.length; i++) {
      this.detectedCards[i].trackWindow = await this.detectedCards[i].tracker.update(frame)[1]
      this.detectedCards[i].draw(conout)
      if (detectedIn[i]) {
        if (this.detectedCards[i].lostCount > 0) this.detectedCards[i].lostCount = 0
        this.detectedCards[i].detCount++
      } else {
        if (this.detectedCards[i].detCount > 0) this.detectedCards[i].detCount = 0
        this.detectedCards[i].lostCount++
        if (this.detectedCards[i].lostCount > 20) {
          this.detectedCards[i].snap.delete()
          this.detectedCards[i].titlearea.delete()
          this.detectedCards.splice(i, 1)
        }
      }
    }
    

    cv.imshow('canvasOutput', filters)
    cv.imshow('canvasOutput2', conout)

    filters.delete()
    contours.delete()
    hierarchy.delete()
    conout.delete()

    this.frame.delete()
    return //found
  }

  async threshContours(img) {
    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    let out = new cv.MatVector()
    await cv.findContours(img, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    for (let i = 0; i < contours.size(); i++) {
      let cnt = contours.get(i)
      let area = cv.contourArea(cnt)
      if (area > 1000) {
        let per = cv.arcLength(cnt, true)
        let tmp = new cv.Mat()
        await cv.approxPolyDP(cnt, tmp, 0.02 * per, true)
        let points = tmp.size().height
        if (points == 4) {
          let rotatedRect = cv.minAreaRect(cnt)
          let ratio = 0
          rotatedRect.size.width < rotatedRect.size.height ? ratio = rotatedRect.size.width / rotatedRect.size.height : ratio = rotatedRect.size.height / rotatedRect.size.width
          //console.log(ratio)
          if (ratio > 0.69 && ratio < 0.82) {
            out.push_back(cnt)
          }
        }
      }
    }

    contours.delete()
    hierarchy.delete()

    return out
  }

  async runFilters(img=this.frame.clone()) {
    let filters = new cv.Mat()
    
    filters = await this.applyContrast(img, 25)
    img.delete()

    await cv.addWeighted(filters, 1, filters, 0.30, 0, filters)

    await cv.cvtColor(filters, filters, cv.COLOR_BGR2GRAY)
    
    

    filters = await this.applyContrast(filters, 30)

    let ksize = new cv.Size(5, 5)
    await cv.GaussianBlur(filters, filters, ksize, 2, 1, cv.BORDER_DEFAULT)

    

    await cv.addWeighted(filters, 1, filters, -0.1, 0, filters)

    filters = await this.applyContrast(filters, 30)

    await cv.threshold(filters, filters, 75, 255, cv.THRESH_BINARY_INV)

    return filters
  }

  async applyContrast(img, contrast) {
    let alpha = 131 * (contrast + 127)/(127 * (131 - contrast))
    let gamma = 127*(1 - alpha)

    let result = new cv.Mat()
    await cv.addWeighted(img, alpha, img, 0, gamma, result)
    return result
  }
  
}
