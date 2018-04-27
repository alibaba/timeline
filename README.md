# Timeline

时间线管理器

> Manage all your events and animations together.
>
> Keep everything happen at the right time.



# 安装

`tnpm i --save @ali/Timeline`

当前版本: `0.5.0`

支持环境: `Dom环境`、`Web Worker`、`node`、`electron`

---

# 基本使用

```javascript
const timeline = new Timeline({
    duration: Infinity, // 整个timeline的时长，超过后会停止或循环
    autoRecevery: true, // 是否自动回收结束的track轨道
})

timeline.play();

timeline.addTrack({
    startTime: timeline.currentTime + 500, // 开始时间
    duration: 1000, // 时长
    loop: false, // 是否循环
    onStart: (time) => {console.log('start')}, // 起始回调
    onEnd: (time) => {console.log('end')}, // 结束回调
    onUpdate: (time, p) => {console.log('update', time, p)}, // 更新回调
})
```

---

# 接口

## **Timeline**

### `constructor`

- autoRecevery: false,
    - 是否自动回收结束的track轨道
- loop: false,
    - 结束后是否循环
- duration: Infinity,
    - 整个timeline的时长，超过后会停止或循环
- pauseWhenInvisible: false,
    - 标签页不可见时自动暂停播放
- maxStep: Infinity,
    - 最长帧时间限制，如果帧步长超过这个值，则会被压缩到这个值,
    - 用于避免打断点时继续计时，端点结束后时间突进
- maxFPS: Infinity
    - 最大帧率，如果你的程序在高FPS下运行不够稳定，可以让TimeLine主动降帧
    - ** 建议将这个值设为浏览器帧率（通常是60）的因数，例如30、20、10

### methods

- `play()`
    - 开始播放（从头开始）

- `stop()`
    - 停止播放


- `seek(time)`
    - 时间定位

- `pause()`
    - 暂停播放，会记录当前时间，可以用resume恢复播放

- `resume()`
    - 恢复播放，配合pause使用，将当前时间恢复到上一次pause时的时间

- `recovery()`
    - 回收无用的track

- `addTrack(trackConfig)`
    - 创建并添加一个轨道，详见Track

- `stopTrack({uuid})`
    - 停掉一个track，将其alive置为false，
    - 如果还未播放则不会在播放，如果正在播放则会停止，会被下一次recovery执行时被删掉

- `getTracksByID(id)`
    - 返回一个id匹配的track的数组


**以下接口行为与DOM标准保持一致，但是全部与timeline中的时间和行为对齐**


- `setTimeout(callback, time): Int`
    - setTimeout的timeline版本，返回一个id可以用来取消

- `clearTimeout(id)`
    - 同clearTimeout

- `setInterval(callback, time): Int`
    - setInterval的timeline对齐版本，返回一个ID可以用来取消

- `clearInterval(id)`
    - 同clearInterval

- `getTime()`
    - 类似于`new Date().getTime()`，获取当前系统时间的时间戳。
    - 如果调用了play，将以调用时的系统时间为基准；如果没有掉用过play，将以初始化时的系统时间为基准。


### properties

- currentTime: 当前时间
- running： 是否在播放中
- onEnd(setter): 播放完成的回调
- tracks: 这个timeline中所有的track


## **Track**

一个track（轨道）是时间线上的一段区间，相当于Tween.js中的一个tween对象，有开始时间、结束时间、时长、起始回调、终止回调、过程回调，可以循环，首次开始还有初始化回调。

![](https://img.alicdn.com/tfs/TB1yL.4ebGYBuNjy0FoXXciBFXa-2382-482.png)


- id: undefined 方便debug
- loop: false,  是否循环
- startTime,    开始时间
- endTime,      结束时间
- duration,     时长，duration和endTime输入一个即可
- onStart,      起始回调，参数：time
- onEnd,        终止回调，参数：time
- onUpdate,     过程会掉，参数：time, p 其中p为该轨道当前进度(0~1)
- onInit,       首次开始前的回调，无论loop与否都只会触发一次
- alive,        **废弃** 如需要删除该track，只需要将alive置为false，该track就不会再执行，会在timeline执行recovery时被清除

---

# 性能

根据benchmark（demo/benchmark.html），Timeline中放入 100,000 个track时的**自身性能消耗**（所有回调函数设为空函数）为 `每帧2ms`。

该组件不太可能成为性能瓶颈。

根据`@ali/Flyline`的benchmark结果，相同功能下，Timeline的自身性能消耗小于Tween.

# 注意事项

- Timeline基于requestAnimationFrame，精度限制在raf的调用频率，通常为16ms或32ms

- 由于(页面卡顿|用户来回切页面|轨道duration过短)等原因，可能会造成一些track的时间被整体跳过，timeline为了保证**最终结果正确**，依然会执行该track的所有回调。即：每个track的所有回调至少都会被调用一次，来保证最终结果的正确。


# TODO

- [ ] 加入循环次数的处理

- [ ] 加入循环间隔的处理
