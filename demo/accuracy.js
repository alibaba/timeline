const timeline = new Timeline({
	pauseWhenInvisible: true,
	duration: 10000,
	maxStep: 100,
	// maxFPS: 30,
	// fixStep: 16,
})

let _t = 0

timeline.addTrack({
	duration: 5000,
	onUpdate: (time, p) => {
		console.log(time - _t, time)
		_t = time
	},
})

timeline.play()
