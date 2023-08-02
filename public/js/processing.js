class CardProcessor {
    constructor() {
        this.worker = undefined
        this.setUpWorker()
    }

    async setUpWorker() {
        this.worker = await createWorker()
        await this.worker.loadLanguage('eng')
        await this.worker.initialize('eng')
    }

    async process(sel) {
        const { data: { text } } = await this.worker.recognize(document.querySelector(sel).toDataURL("image/png"))
        console.log(text)
        if (text == "") {
        cardDetected = false
        }
        document.querySelector('#cardName').innerHTML = text
    }
}
  