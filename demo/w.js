// console.log(process);

import Timeline from '../dist/Timeline';

const timeline = new Timeline({})

console.log('worker', timeline);

timeline.play()
timeline.addTrack({
    duration: 1000000,
    onUpdate: (time, p) => {console.log(time, p);}
})
