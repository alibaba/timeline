const worker = new Worker('/static/parallel.worker.demo.js')
// const worker2 = new Worker('/static/parallel.worker.demo.js')

// const timeline = new Timeline({
//     pauseWhenInvisible: true,
//     duration: Infinity,
//     maxStep: 100,
// })

const timeline = new Timeline({
	pauseWhenInvisible: true,
	duration: Infinity,
	maxStep: 100,
	maxFPS: 10,

	// shadows: [worker],
	// shadows: [worker, worker],
	// shadows: [worker, worker, worker2, worker2],
	// id: 't_0'
})

timeline.listen(worker)

// timeline.addTrack({
//     duration: 500,
//     onStart: () => {console.log(timeline.currentTime);},
//     // onUpdate: (time, p) => { console.log(timeline.currentTime) },
//     onUpdate: (time, p) => { document.body.innerHTML = time },
//     loop: true,
// })

timeline.addTrack({
	duration: 2000,
	onInit: () => {
		console.log('origin init', timeline.getTime())
	},
	onStart: () => {
		console.log('origin start', timeline.getTime())
	},
	onUpdate: (t, p) => {
		console.log('origin update', t, p, timeline.getTime())
	},
	onEnd: (t, p) => {
		console.log('origin end', t, p, timeline.getTime())
	},
})

timeline.play()

// const a = new Float32Array(10)
// worker.postMessage({
//     name: 'a'
// }, [a.buffer])
