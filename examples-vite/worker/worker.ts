console.log('I am in a Worker 👋')

// worker test
{
	console.log(self)
}

// raf test
if (false) {
	let last = performance.now()
	function tick() {
		const curr = performance.now()
		const diff = curr - last
		last = curr
		console.log(diff)

		requestAnimationFrame(tick)
	}

	requestAnimationFrame(tick)
}

import { Timeline } from '../../src/Timeline'
import { Track } from '../../src/Track'

const timeline = new Timeline({
	// autoRelease: true,
	loop: true,
	duration: 5000,
	// maxFPS: 5,
})
const track = new Track({
	startTime: 1000,
	endTime: 2000,
	onStart: (t) => console.log('onStart', t),
	onEnd: (t) => console.log('onEnd', t),
	onUpdate: (t, p) => console.log('onUpdate', t, p),
	onInit: () => console.log('onInit'),
})

timeline.add(track)

timeline.play()
