importScripts('/static/import.demo.js')

const timeline = new Timeline({
	// port: self,
	// id: 't_0'
	// onUpdate: () => {debugger}
})

timeline.setOrigin(self)

const timeline2 = new Timeline({
	// port: self,
	// id: 't_0'
})

timeline2.setOrigin(timeline)

// console.log(timeline, timeline2);

timeline.addTrack({
	duration: 2000,
	onInit: () => {
		console.log('%c shadow init', 'color: green', timeline.getTime())
	},
	onStart: () => {
		console.log('%c shadow start', 'color: green', timeline.getTime())
	},
	onUpdate: (t, p) => {
		console.log('%c shadow update', 'color: green', t, p, timeline.getTime())
	},
	onEnd: (t, p) => {
		console.log('%c shadow end', 'color: green', t, p, timeline.getTime())
	},
})

timeline2.addTrack({
	duration: 2000,
	onInit: () => {
		console.log('%c shadow2 init', 'color: purple', timeline2.getTime())
	},
	onStart: () => {
		console.log('%c shadow2 start', 'color: purple', timeline2.getTime())
	},
	onUpdate: (t, p) => {
		console.log('%c shadow2 update', 'color: purple', t, p, timeline2.getTime())
	},
	onEnd: (t, p) => {
		console.log('%c shadow2 end', 'color: purple', t, p, timeline2.getTime())
	},
})

// timeline2.addTrack({
//     duration: 2000,
//     onUpdate: (t, p) => {
//         console.log('shadow2', t, p, timeline.getTime())
//     }
// })

// self.addEventListener('message', e => {
//     console.log('#m', e.data);
//     if (e.data.name === 'a') {
//         console.log('#aaaaa', e);
//     }
// })
