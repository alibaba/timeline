importScripts('/static/import.demo.js')

const timeline = new ShadowTimeline({
    port: self,
    id: 't_0'
})

const timeline2 = new ShadowTimeline({
    port: self,
    id: 't_0'
})

timeline.addTrack({
    duration: 2000,
    onUpdate: (t, p) => {
        console.log('shadow1', t, p, timeline.getTime())
    }
})

timeline2.addTrack({
    duration: 2000,
    onUpdate: (t, p) => {
        console.log('shadow2', t, p, timeline.getTime())
    }
})

//
// self.addEventListener('message', e => {
//     if (e.data.name === 'a') {
//         console.log('#aaaaa', e);
//     }
// })
