const timeline = new Timeline({
	pauseWhenInvisible: true,
	duration: Infinity,
	maxFPS: 30,

	ignoreErrors: false,
	outputErrors: true,
})

timeline.addTrack({
	duration: 3000,
	loop: true,
	onUpdate: (t, p) => {
		throw new Error('#1')
	},
})

timeline.play()
