const n = 100000
const timeline = new Timeline({
	openStats: true,
	maxFPS: 30,
})
timeline.play()
for (let i = 0; i < n; i++) {
	timeline.addTrack({
		startTime: i * 10,
		duration: 2000,
		onStart: () => {},
		onUpdate: () => {},
	})
}
