class CardTracker {
    constructor(cnt) {
        this.cnt = cnt

        this.trackWindow = cv.boundingRect(cnt)
        this.trackWindow.x-=10
        this.trackWindow.y-=10
        this.trackWindow.width+=20
        this.trackWindow.height+=20

        this.trackBox = cv.minAreaRect(cnt)

        this.tracker = new cv.TrackerMIL()
        this.tracker.init(frame, this.trackWindow)

        this.lostCount = 0
        this.detCount = 0
        this.lastDet = 0

        this.snap = new cv.Mat()
        this.titlearea = new cv.Mat()

        this.capture()
    }

    async capture() {
        await new Promise(r => setTimeout(r, 1500))

        var f = detector.frame.clone()

        let rotatedRect = cv.minAreaRect(this.cnt)

        //console.log(rotatedRect)

        let vertices = cv.RotatedRect.points(this.trackBox)

        if (rotatedRect.size.width > rotatedRect.size.height) {
            vertices = [vertices[3],vertices[0],vertices[1],vertices[2]]
        }

        let w = 525
        let h = 700
        let dpts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, h-1, 0, 0, w-1, 0, w-1, h-1])
        let box = cv.matFromArray(4, 1, cv.CV_32FC2, vertices.map((v) => [v.x, v.y]).flat())
        let M = await cv.getPerspectiveTransform(box, dpts)
        let dsize = new cv.Size(w, h);
        await cv.warpPerspective(f, this.snap, M, dsize)

        f.delete()

        let titleRect = {x: 0, y:0, width:525, height: 120}
        this.titlearea = this.snap.roi(titleRect).clone()

        ///await cv.cvtColor(this.titlearea, this.titlearea, cv.COLOR_BGR2GRAY)

        //await cv.threshold(this.titlearea, this.titlearea, 0, 255, cv.THRESH_BINARY)

        //this.titlearea = await detector.applyBrightness(this.titlearea, brightmod)

         /*

        //this.titlearea = await detector.applyContrast(this.titlearea, 30)

        await cv.addWeighted(this.titlearea, 1, this.titlearea, -0.1, 0, this.titlearea)

        await cv.cvtColor(this.titlearea, this.titlearea, cv.COLOR_BGR2GRAY)

        let k = cv.Mat.ones(3, 3, cv.CV_8U)
        await cv.erode(this.titlearea, this.titlearea, k)
        await cv.erode(this.titlearea, this.titlearea, k)

        let ksize = new cv.Size(5, 5)
        await cv.GaussianBlur(this.titlearea, this.titlearea, ksize, 2, 1, cv.BORDER_DEFAULT)

        await cv.addWeighted(this.titlearea, 1, this.titlearea, -0.1, 0, this.titlearea)

        this.titlearea = await detector.applyContrast(this.titlearea, 30)

       

        //await cv.threshold(this.titlearea, this.titlearea, 200, 255, cv.THRESH_BINARY)

        await cv.Canny(this.titlearea, this.titlearea, 30, 170, 3, true)

        //let k = cv.Mat.ones(3, 3, cv.CV_8U)
        //await cv.dilate(this.titlearea, this.titlearea, k)

        let contours = new cv.MatVector()
        let hierarchy = new cv.Mat()
        var out = new cv.MatVector()
        
        await cv.findContours(this.titlearea, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        var mostp = 0
        var highestp = 0

        for (let i = 0; i < contours.size(); i++) {
            var cnt = contours.get(i)
            var area = cv.contourArea(cnt)
            var per = cv.arcLength(cnt, true)
            if (per > highestp) {
                highestp = per
                mostp = i
            }
            //console.log(per)
            if (per > 1000) {
                console.log(per)
                out.push_back(cnt)
            }
        }

        var c = contours.get(mostp)

        let newRect = cv.minAreaRect(c)
        console.log(newRect)
        var v = cv.RotatedRect.points(newRect)
        var minx = 9999
        var miny = 9999
        var maxx = 0
        var maxy = 0
        //console.log(vertices)
        for (let i = 0; i < 4; i++) {
            let p = v[i]
            //console.log([vertices[i]])
            if (p['x'] < minx) minx = p['x']
            if (p['x'] > maxx) maxx = p['x']
            if (p['y'] < miny) miny = p['y']
            if (p['y'] > maxy) maxy = p['y']
        }

        console.log({x: minx-5, y: miny-5, width: maxx - minx + 10, height: maxy - miny + 10})

        this.titlearea = this.snap.roi(titleRect)

        let t = this.titlearea.roi({x: minx-5, y: miny-5, width: maxx - minx + 10, height: maxy - miny + 10}).clone()
        //let rectangleColor = new cv.Scalar(255, 0, 0)
        //cv.drawContours(this.titlearea, out, 0, rectangleColor, 10)

        //await cv.Canny(this.titlearea, this.titlearea, 30, 170, 3, true)

        */

        await cv.imshow('snapOutput', this.titlearea)

        await processor.process('#snapOutput')
    }

    async isWithin(cnt) {
        let inner = cv.minAreaRect(cnt)
        var vertices = cv.RotatedRect.points(inner)
        var minx = 9999
        var miny = 9999
        var maxx = 0
        var maxy = 0
        //console.log(vertices)
        for (let i = 0; i < 4; i++) {
            let p = vertices[i]
            //console.log([vertices[i]])
            if (p['x'] < minx) minx = p['x']
            if (p['x'] > maxx) maxx = p['x']
            if (p['y'] < miny) miny = p['y']
            if (p['y'] > maxy) maxy = p['y']
        }

        var stats = {
            'minx': minx + 0.0,
            'maxx': maxx + 0.0,
            'miny': miny + 0.0,
            'maxy': maxy + 0.0,
            't-minx': this.trackWindow.x + 0.0,
            't-maxx': this.trackWindow.x + this.trackWindow.width + 0.0,
            't-miny': this.trackWindow.y + 0.0,
            't-maxy': this.trackWindow.y + this.trackWindow.height + 0.0
        }

        var results = [
            stats['minx'] > stats['t-minx'],
            stats['minx'] < stats['t-maxx'],
            stats['maxx'] < stats['t-maxx'],
            stats['miny'] > stats['t-miny'],
            stats['miny'] < stats['t-maxy'],
            stats['maxy'] < stats['t-maxy'],
        ]

        if (results.indexOf(false) == -1){
            this.detCount++
            
            this.cnt = cnt
            return true
        }

        return false
    }

    draw(img) {
        let rectangleColor = new cv.Scalar(255, 0, 0)
        let point1 = new cv.Point(this.trackWindow.x, this.trackWindow.y);
        let point2 = new cv.Point(this.trackWindow.x + this.trackWindow.width, this.trackWindow.y + this.trackWindow.height);
        if (point1.x < 0) point1.x = 0
        if (point2.x < 0) point2.x = 0
        if (point1.x > video.width) point1.x = video.width
        if (point2.x > video.width) point2.x = video.width
        if (point1.y < 0) point1.y = 0
        if (point2.y < 0) point2.y = 0
        if (point1.y > video.height) point1.y = video.height
        if (point2.y > video.height) point2.y = video.height
        //console.log(point1, point2)
        cv.rectangle(img, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

        if (this.lostCount < 6) {
            let outline = new cv.MatVector()
            outline.push_back(this.cnt)
            cv.drawContours(img, outline, -1, rectangleColor, 3)
        }

        return 
    }

}