import Timeline from './Timeline'

export default class SubTimeline extends Timeline {
	constructor(props) {
		super(props)

		this.startTime = 0
		this.duration = Infinity

		this.parent = null

		this.onInit = (time) => {
			this.referenceTime = 0
			this.currentTime = time
		}
	}

	tick(time) {
		for (let i = 0; i < this.tracks.length; i++) {
			this.tracks[i].tick(time);
		}
	}

	play() { console.error('SubTimeline shall not be edited derictly!'); }
	seek() { console.error('SubTimeline shall not be edited derictly!'); }
	stop() { console.error('SubTimeline shall not be edited derictly!'); }
	pause() { console.error('SubTimeline shall not be edited derictly!'); }
	resume() { console.error('SubTimeline shall not be edited derictly!'); }
}
