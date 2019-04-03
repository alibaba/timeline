/* eslint-disable no-undef */
const timeline = new Timeline({
	duration: 10000,
})
window.timeline = timeline

window.track = timeline.add({
	startTime: 5000,
	duration: 1000,
	onInit: t => console.log('init', t),
	onStart: t => console.log('start', t),
	onEnd: t => console.log('end', t),
	onUpdate: (t, p) => console.log('update', t, p),
	loop: 2,
})

track.tick(5002)
console.log('-----------')
track.tick(6002)
console.log('-----------')
track.tick(7002)
console.log('-----------')
track.tick(5002)
console.log('-----------')
track.tick(4002)
