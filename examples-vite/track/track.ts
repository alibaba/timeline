import { observe } from '../__utils/observe'

import { Track } from '../../src/Track'

const track = new Track({
	// loop: true,
	startTime: 2000,
	duration: 2000,
	onStart: (t) => console.log('onStart', t),
	onEnd: (t) => console.log('onEnd', t),
	onUpdate: (t, p) => console.log('onUpdate', t, p),
	onInit: () => console.log('onInit'),
})

{
	const span = document.querySelector('#timeline-current-value')
	const input = document.querySelector('#time') as HTMLInputElement
	input.addEventListener('input', (e) => {
		// console.log(input.value)
		span.innerHTML = `${input.value}`
		track.tick((input.value as any) - 0)
	})
	window['setTime'] = (time) => {
		input.value = time

		input.dispatchEvent(new Event('input'))
	}
}
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
// {
// 	const span = document.querySelector('#track-current-value')
// 	observe(track, 'currentTime', (newV, oldV, track, key) => {
// 		span.innerHTML = `${newV}`
// 	})
// }
