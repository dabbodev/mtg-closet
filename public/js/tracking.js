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
    }

    async isWithin(cnt) {
        let inner = cv.minAreaRect(cnt)
        var vertices = cv.RotatedRect.points(inner)
        var minx = 9999
        var miny = 9999
        var maxx = 0
        var maxy = 0
        console.log(vertices)
        for (let i = 0; i < 4; i++) {
            let p = vertices[i]
            console.log([vertices[i]])
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
        cv.rectangle(img, point1, point2, rectangleColor, 2, cv.LINE_AA, 0);

        if (this.lostCount < 6) {
            let outline = new cv.MatVector()
            outline.push_back(this.cnt)
            cv.drawContours(img, outline, -1, rectangleColor, 3)
        }

        return 
    }

}