# Timeline

时间线管理器

> Manage all your events and animations together.
>
> Keep everything happen at the right time.

在一个Timeline中管理所有的动画和事件，WebMedia-like接口，致力于稳定、流畅地实现复杂动画并易于调试。

**支持多线程、multi-context同步。**

Timeline的设计原则是：无论何时从任意时间跳到任意时间，总能保证最终结果的正确。

# 安装

`tnpm i --save @ali/Timeline`

![](http://web.npm.alibaba-inc.com/badge/v/@ali/Timeline.svg?style=flat-square)

支持环境: `broswer`、`WebWorker`、`node.js`、`electron`、`webview`

---

# 基本使用

```javascript
import Timeline from '@ali/Timeline'

const timeline = new Timeline({
    duration: Infinity, // 整个timeline的时长，超过后会停止或循环
    autoRecevery: true, // 是否自动回收结束的track轨道
})

timeline.play()

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

# 多线程同步

```javascript
// 主线程

const worker = new Worker('worker.js')

const timeline = new Timeline.OriginTimeline()


timeline.addTrack({
    duration: 2000,
    onUpdate: (t, p) => {
        console.log('origin', t, p, timeline.getTime())
    }
})

timeline.play()
```

```javascript
// worker.js

importScripts('/path/to/Timeline.js')

const timeline = new Timeline.ShadowTimeline({
    port: self,
    id: 't_0',
})

timeline.addTrack({
    duration: 2000,
    onUpdate: (t, p) => {
        console.log('shadow', t, p, timeline.getTime())
    }
})
```

---

# 接口

## **Timeline**

### `constructor`

- autoRecevery: false,
    - 是否自动回收结束的track轨道，如果不需要loop整个timelne则建议打开，以免内存溢出
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
    - 最大帧率，如果你的程序在高FPS下运行不够稳定，可以让TimeLine主动降帧，因为 **稳定的低帧率比不稳定的高帧率看起来更流畅**
    - ** 建议将这个值设为浏览器帧率（通常是60）的因数，例如60、30、20、10
- openStats: false
    - 是否打开性能面板
    - 在外部使用stats.js测到的帧率和帧时间是不准确的，因此timeline在内部封装了stats.js，直接打开即可
- ignoreErrors: true
	- 用户代码抛错后是否继续运行，如果关闭此项，回调抛错会导致整个timeline停止运行
- outputErrors: true
	- 用户代码抛错后是否输出错误，配合ignoreErrors使用
	- 如果开启ignoreErrors并且开启outputErrors，可能会由于连续打印错误而造成内存溢出

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

- `add(trackConfig)` : Track
    - 创建并添加一个轨道，详见Track

- `stopTrack(Track)`
    - 停掉一个track，将其alive置为false，
    - 如果还未播放则不会在播放，如果正在播放则会停止，会被下一次recovery执行时被删掉
    - 也可以只传入Track的UUID: `stopTrack({uuid})`

- `getTracksByID(id)`
    - 返回一个id匹配的track的数组

- `setOrigin(Timeline|Worker|WorkerGlobalScope|MessagePort)`
    - 设置 Origin Timeline，将自己变成这个timeline的 shadow timeline
	- 源timeline可以为远程timeline，此时应传入通信端口：Worker|WorkerGlobalScope|MessagePort
	- 源timeline也可以为本地上下文中的另一个Timeline，此时应传入实例

- `listen(Worker|WorkerGlobalScope|MessagePort)`
	- 监听来自一个通讯端口的消息，以作为其他timeline的Origin
	- 如果要将本timeline作为其他上下文中timeline的源timeline，需要监听通信端口

**以下接口行为与DOM标准保持一致，但是全部与timeline中的时间和行为对齐**


- `setTimeout(callback, time): Int`
    - setTimeout的timeline版本，返回一个id可以用来取消

- `clearTimeout(id)`
    - 同clearTimeout

- `setInterval(callback, time): Int`
    - setInterval的timeline对齐版本，返回一个ID可以用来取消

- `clearInterval(id)`
    - 同clearInterval

<!-- - `getTime()`
    - 获取当前时间线的本地时间戳。
    - 如果调用了play，将以调用时的系统时间为基准；如果没有掉用过play，将以初始化时的系统时间为基准。 -->


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
- easing,       缓动函数，等同于在onUpdate中对p进行处理，起始值和终点值应该为0和1
- alive,        **废弃** ~~如需要删除该track，只需要将alive置为false，该track就不会再执行，会在timeline执行recovery时被清除~~


## **Origin - Shadow**

一个Timeline实例通过setOrigin添加自己的Origin之后，自己就会成为一个Shadow Timeline。

作为Shadow的Timeline，行为会被作为Origin的Timeline同步，不能再控制自己的播放与暂停。

- `play|tick|seek|stop|pause|resume`这些控制方法会失效
- `.running` 会永远返回false

一个Origin可以拥有多个Shadow，一个shadow只能拥有一个Origin。

Shadow 与 Origin 配对的方式是：

### 同一个上下文（本地Shadow）

1. `shadow.setOrigin(origin)`

### 不同上下文（远程shadow）

1. origin 监听通信端口 `origin.listen(Worker|WorkerGlobalScope|MessagePort)`
2. shadow 向通信端口发出配对请求 `shadow.setOrigin(Worker|WorkerGlobalScope|MessagePort)`

---

# 性能

根据benchmark（demo/benchmark.html），Timeline中放入 100,000 个track时的**自身性能消耗**（所有回调函数设为空函数）为 `每帧2ms`。

该组件不太可能成为性能瓶颈。

根据`@ali/Flyline`的benchmark结果，相同功能下，Timeline的自身性能消耗小于Tween.

# 注意事项

- *l小写*

- Timeline基于requestAnimationFrame，精度限制在raf的调用频率，通常为16ms或32ms

- 由于(页面卡顿|用户来回切页面|轨道duration过短)等原因，可能会造成一些track的时间被整体跳过，timeline为了保证**最终结果正确**，依然会执行该track的所有回调。即：每个track的所有回调至少都会被调用一次，来保证最终结果的正确。

- 请避免Track之前相互依赖，如果多个Track被跳过，Timeline将按照Track被add的顺序依次处理，无法保证不同Track之间时间点的顺序正确

- 多线程开发中，OriginTimeline和ShadowTimeline之间的同步会存在延迟(1ms以内)，如果ShadowTimeline被阻塞则会出现两个线程节奏不同步，Timeline会自动处理节奏不同步的问题，不会造成请求累积，保证最终结果的正确（最近一次指令总会执行），但是会出现<=两帧的延迟。

- 想使用Tween的缓动函数？很简单：

```javascript
timeline.addTrack({
    duration: 5000,
    onUpdate: (t, p) => {
        p = TWEEN.Easing.Quadratic.InOut(p);
        div.style.left = `${1000 * p}px`;
    }
})

// or

timeline.addTrack({
    duration: 5000,
    easing: TWEEN.Easing.Quadratic.InOut,
    onUpdate: (t, p) => {
        div.style.left = `${1000 * p}px`;
    },
})

```


# TODO

- [ ] 加入循环次数的处理

- [ ] 加入循环间隔的处理

- [ ] 加入缓动函数接口
