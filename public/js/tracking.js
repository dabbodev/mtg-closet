class CardTracker {
    constructor(cnt) {
        this.cnt = cnt

        this.trackWindow = cv.boundingRect(cnt)
        this.trackWindow.x-=40
        this.trackWindow.y-=40
        this.trackWindow.width+=80
        this.trackWindow.height+=80

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

        var f = frame.clone()

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

        let titleRect = {x: 0, y:0, width:430, height: 100}
        this.titlearea = this.snap.roi(titleRect)

        cv.imshow('snapOutput', this.titlearea)

        processor.process('#snapOutput')
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