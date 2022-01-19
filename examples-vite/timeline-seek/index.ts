import { observe } from '../__utils/observe'

import { Timeline } from '../../src/Timeline'
import { Track } from '../../src/Track'

const timeline = new Timeline({
	// autoRelease: true,
	loop: true,
	duration: 5000,
	// maxFPS: 5,
})

{
	// track that start and end together with timeline
	const track = new Track({
		startTime: 0,
		endTime: 5000,
		onStart: (t) => console.log('onStart', t),
		onEnd: (t) => console.log('onEnd', t),
		onUpdate: (t, p) => console.log('onUpdate', t, p),
		onInit: () => console.log('onInit'),
	})

	// timeline.add(track)
	// ob(track)
	// window['track'] = track
}
{
	// loop track that start and end together with timeline
	const track = new Track({
		loop: true,
		startTime: 0,
		endTime: 5000,
		onStart: (t) => console.log('onStart', t),
		onEnd: (t) => console.log('onEnd', t),
		// onUpdate: (t, p) => console.log('onUpdate', t, p),
		onInit: () => console.log('onInit'),
	})

	// timeline.add(track)
	// ob(track)
	// window['track'] = track
}
{
	// @check loop track that start from 0 won't be reset when timeline loop
	const track = new Track({
		startTime: 0,
		endTime: 1000,
		loop: true,
		onStart: (t) => console.log('onStart', t),
		onEnd: (t) => console.log('onEnd', t),
		// onUpdate: (t, p) => console.log('onUpdate', t, p),
		onInit: () => console.log('onInit'),
	})

	// timeline.add(track)
	// ob(track)
	// window['track'] = track
}
{
	// @check loop track that end together with timeline will fire a pair of useless start/end event in the end
	const track = new Track({
		startTime: 500,
		endTime: 1000,
		loop: true,
		onStart: (t) => console.log('onStart', t),
		onEnd: (t) => console.log('onEnd', t),
		// onUpdate: (t, p) => console.log('onUpdate', t, p),
		onInit: () => console.log('onInit'),
	})

	// timeline.add(track)
	// ob(track)
	// window['track'] = track
}
{
	const track = new Track({
		startTime: 500,
		endTime: 1099,
		loop: true,
		onStart: (t) => console.log('onStart', t),
		onEnd: (t) => console.log('onEnd', t),
		// onUpdate: (t, p) => console.log('onUpdate', t, p),
		onInit: () => console.log('onInit'),
	})

	timeline.add(track)
	ob(track)
	// window['track'] = track
}

// timeline dom
{
	const input = document.querySelector('#time') as HTMLInputElement
	const play = document.querySelector('#play') as HTMLButtonElement
	const stop = document.querySelector('#stop') as HTMLButtonElement
	const pause = document.querySelector('#pause') as HTMLButtonElement
	const resume = document.querySelector('#resume') as HTMLButtonElement

	play.onclick = (e) => timeline.play()
	stop.onclick = (e) => timeline.stop()
	pause.onclick = (e) => timeline.pause()
	resume.onclick = (e) => timeline.resume()
	input.addEventListener('input', (e) => {
		timeline.seek((input.value as any) - 0)
		timeline.tick()
	})

	// window['setTime'] = (time) => {
	// 	input.value = time
	// 	input.dispatchEvent(new Event('input'))
	// }

	window['timeline'] = timeline

	{
		const span = document.querySelector('#timeline-current-value')
		observe(timeline, 'currentTime', (newV, oldV, track, key) => {
			span.innerHTML = `${(newV as number).toFixed(4)}`
			input.value = `${newV}`
		})
	}
	{
		const span = document.querySelector('#timeline-end-value')
		observe(timeline, 'duration', (newV, oldV, track, key) => {
			span.innerHTML = `${(newV as number).toFixed(4)}`
		})
	}
	{
		const span = document.querySelector('#timeline-playing-value')
		observe(timeline, 'playing', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
		})
	}
	{
		const span = document.querySelector('#timeline-referenceTime-value')
		observe(timeline, '_referenceTime' as any, (newV, oldV, track, key) => {
			span.innerHTML = `${(newV as number).toFixed(4)}`
		})
	}
	{
		const span = document.querySelector('#timeline-animationFrameID-value')
		observe(timeline, '_animationFrameID' as any, (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
		})
	}
	{
		const span = document.querySelector('#timeline-fps-value')
		observe(timeline, 'fps', (newV, oldV, track, key) => {
			span.innerHTML = `${(newV as number).toFixed(4)}`
		})
	}
	{
		const span = document.querySelector('#timeline-_timeBeforePaused-value')
		observe(timeline, '_timeBeforePaused' as any, (newV, oldV, track, key) => {
			span.innerHTML = `${(newV as number).toFixed(4)}`
		})
	}
}

// track dom
function ob(track: Track) {
	{
		const span = document.querySelector('#track-alive-value')
		observe(track, 'alive', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
		})
	}

	{
		const span = document.querySelector('#track-iteration-value')
		observe(track, 'iteration', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
		})
	}

	{
		const span = document.querySelector('#track-started-value')
		observe(track, 'started', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
		})
	}
	{
		const span = document.querySelector('#track-inited-value')
		observe(track, 'inited', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
		})
	}
	{
		const span = document.querySelector('#track-running-value')
		observe(track, 'running', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
		})
	}
	{
		const span = document.querySelector('#track-loop-value')
		observe(track, 'loop', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
		})
	}

	const trackElem = document.querySelector('#track') as HTMLDivElement
	{
		const span = document.querySelector('#track-start-value')
		observe(track, 'startTime', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
			trackElem.style.marginLeft = `${(newV / timeline.duration) * 1000}px`
		})
	}
	{
		const span = document.querySelector('#track-end-value')
		observe(track, 'endTime', (newV, oldV, track, key) => {
			span.innerHTML = `${newV}`
			trackElem.style.width = `${((newV - track.startTime) / timeline.duration) * 1000}px`
		})
	}

	{
		const spanCurrentTime = document.querySelector('#track-currentTime-value')
		const spanPercent = document.querySelector('#track-percent-value')
		if (!track.onUpdate) {
			track.onUpdate = (currentTime, percent) => {
				spanCurrentTime.innerHTML = `${(currentTime as number).toFixed(4)}`
				spanPercent.innerHTML = `${(percent as number).toFixed(4)}`
			}
		}
	}
}
