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
}
  