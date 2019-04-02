# Timeline

时间线管理器

> Manage all your events and animations together.
>
> Keep everything happen at the right time.

在一个 Timeline 中管理所有的动画和 shedule 任务，WebMedia-like 接口，致力于稳定、流畅地实现复杂动画并易于调试。

**支持多线程、multi-context 同步。**

Timeline 的设计原则是：无论何时从任意时间跳到任意时间，总能保证最终结果的正确。

# 安装

`tnpm i --save @ali/Timeline`

支持环境: `broswer`、`WebWorker`、`node.js`、`electron`、`webview`

---

# 基本使用

```javascript
import Timeline from '@ali/Timeline'

// 创建一个timeline实例
const timeline = new Timeline({
	duration: Infinity, // 整个timeline的时长，超过后会停止或循环
	autoRecevery: true, // 是否自动回收结束的track轨道
})

// 开始运行这个timeline，我们的接口风格与 HTML Audio 标签保持一致
timeline.play()

// 添加一个track（动画轨道）
timeline.addTrack({
	startTime: timeline.currentTime + 500, // 开始时间
	duration: 1000, // 时长
	loop: false, // 是否循环
	onStart: time => {
		console.log('start')
	}, // 起始回调
	onEnd: time => {
		console.log('end')
	}, // 结束回调
	onUpdate: (time, percent) => {
		console.log('update', time, percent)
	}, // 更新回调
})
```

---

# 多线程同步

**如果你不使用 WebWorker，请跳过这一部分**

```javascript
// 主线程

const worker = new Worker('worker.js')

const timeline = new Timeline()

timeline.listen(worker)

timeline.addTrack({
	duration: 2000,
	onUpdate: (t, p) => {
		console.log('origin', t, p, timeline.getTime())
	},
})

timeline.play()
```

```javascript
// worker.js

importScripts('/path/to/Timeline.js')

const timeline = new Timeline()

timeline.setOrigin(self) // self 就是 worker 和 主线程 通信的通信端口

timeline.addTrack({
	duration: 2000,
	onUpdate: (t, p) => {
		console.log('shadow', t, p, timeline.getTime())
	},
})
```

---

# 接口

## **Timeline**

### `constructor`

- `autoRecevery`: false,
  - 是否自动回收结束的 track 轨道，如果不需要 loop 整个 timelne 则建议打开，以免内存溢出
- `loop`: false,
  - 结束后是否循环
- `duration`: Infinity,
  - 整个 timeline 的时长，超过后会停止或循环
- `pauseWhenInvisible`: false,
  - 标签页不可见时自动暂停播放
- `maxStep`: Infinity,
  - 最长帧时间限制，如果帧步长超过这个值，则会被压缩到这个值,
  - 用于避免打断点时继续计时，端点结束后时间突进
- `maxFPS`: Infinity
  - 最大帧率，如果你的程序在高 FPS 下运行不够稳定，可以让 Timeline 主动降帧，因为 **稳定的低帧率比不稳定的高帧率看起来更流畅**
  - \*\* 建议将这个值设为浏览器帧率（通常是 60）的因数，例如 60、30、20、10
- `openStats`: false
  - 是否打开性能面板
  - 在外部使用 stats.js 测到的帧率和帧时间是不准确的，因此 timeline 在内部封装了 stats.js，直接打开即可
- `ignoreErrors`: true
  - 用户代码抛错后是否继续运行，如果关闭此项，回调抛错会导致整个 timeline 停止运行
- `outputErrors`: true
  - 用户代码抛错后是否输出错误，配合 ignoreErrors 使用
  - 如果开启 ignoreErrors 并且开启 outputErrors，可能会由于连续打印错误而造成内存溢出

### methods

- `play()`

  - 开始播放（从头开始）

- `stop()`
  - 停止播放

* `seek(time)`

  - 时间定位

* `pause()`

  - 暂停播放，会记录当前时间，可以用 resume 恢复播放

* `resume()`

  - 恢复播放，配合 pause 使用，将当前时间恢复到上一次 pause 时的时间

* `recovery()`

  - 回收无用的 track

* `add(trackConfig)` : Track

  - 创建并添加一个轨道，详见 Track

* `stopTrack(Track)`

  - 停掉一个 track，将其 alive 置为 false，
  - 如果还未播放则不会在播放，如果正在播放则会停止，会被下一次 recovery 执行时被删掉

* `getTracksByID(id)`

  - 返回一个 id 匹配的 track 的数组

* `setOrigin(Timeline|Worker|WorkerGlobalScope|MessagePort)`

  - 设置 Origin Timeline，将自己变成这个 timeline 的 shadow timeline - 源 timeline 可以为远程 timeline，此时应传入通信端口：Worker|WorkerGlobalScope|MessagePort - 源 timeline 也可以为本地上下文中的另一个 Timeline，此时应传入实例

* `listen(Worker|WorkerGlobalScope|MessagePort)` - 监听来自一个通讯端口的消息，以作为其他 timeline 的 Origin - 如果要将本 timeline 作为其他上下文中 timeline 的源 timeline，需要监听通信端口

**以下接口行为与 DOM 标准保持一致，但是全部与 timeline 中的时间和行为对齐**

- `setTimeout(callback, time): Int`

  - setTimeout 的 timeline 版本，返回一个 id 可以用来取消

- `clearTimeout(id)`

  - 同 clearTimeout

- `setInterval(callback, time): Int`

  - setInterval 的 timeline 对齐版本，返回一个 ID 可以用来取消

- `clearInterval(id)`
  - 同 clearInterval

<!-- - `getTime()`
​    - 获取当前时间线的本地时间戳。
​    - 如果调用了play，将以调用时的系统时间为基准；如果没有掉用过play，将以初始化时的系统时间为基准。 -->

### properties

- `currentTime`: 当前时间
- `running`： 是否在播放中
- `onEnd`(setter): 播放完成的回调
- `tracks`: 这个 timeline 中所有的 track

## **Track**

一个 track（轨道）是时间线上的一段区间，相当于 Tween.js 中的一个 tween 对象，有开始时间、结束时间、时长、起始回调、终止回调、过程回调，可以循环，首次开始还有初始化回调。

<img src="https://img.alicdn.com/tfs/TB1yL.4ebGYBuNjy0FoXXciBFXa-2382-482.png" width=1000px>

- `id`: undefined 方便 debug
- `loop`: false, 是否循环
- `startTime`, 开始时间
- `endTime`, 结束时间
- `duration`, 时长，duration 和 endTime 输入一个即可
- `onStart`, 起始回调，参数：time
- `onEnd`, 终止回调，参数：time
- `onUpdate`, 过程会掉，参数：time, p 其中 p 为该轨道当前进度(0~1)
- `onInit`, 首次开始前的回调，无论 loop 与否都只会触发一次
- `easing`, 缓动函数，等同于在 onUpdate 中对 p 进行处理，起始值和终点值应该为 0 和 1
- ~~alive~~, **废弃** ~~如需要删除该 track，只需要将 alive 置为 false，该 track 就不会再执行，会在 timeline 执行 recovery 时被清除~~

## **Origin - Shadow**

一个 Timeline 实例通过 setOrigin 添加自己的 Origin 之后，自己就会成为一个 Shadow Timeline。

作为 Shadow 的 Timeline，行为会被作为 Origin 的 Timeline 同步，不能再控制自己的播放与暂停。

- `play|tick|seek|stop|pause|resume`这些控制方法会失效
- `.running` 会永远返回 false

一个 Origin 可以拥有多个 Shadow，一个 shadow 只能拥有一个 Origin。

Shadow 与 Origin 配对的方式是：

### 同一个上下文（本地 Shadow）

1. `shadow.setOrigin(origin)`

### 不同上下文（远程 shadow）

1. origin 监听通信端口 `origin.listen(Worker|WorkerGlobalScope|MessagePort)`
2. shadow 向通信端口发出配对请求 `shadow.setOrigin(Worker|WorkerGlobalScope|MessagePort)`

---

# 性能

根据 benchmark（demo/benchmark.html），Timeline 中放入 100,000 个 track 时的**自身性能消耗**（所有回调函数设为空函数）为 `每帧2ms`。

该组件不太可能成为性能瓶颈。

根据`@ali/Flyline`的 benchmark 结果，相同功能下，Timeline 的自身性能消耗小于 Tween.

# 注意事项

- _`l`小写_

- Timeline 基于 requestAnimationFrame，精度限制在 raf 的调用频率，通常为 16ms 或 32ms

- 由于(页面卡顿|用户来回切页面|轨道 duration 过短)等原因，可能会造成一些 track 的时间被整体跳过，timeline 为了保证**最终结果正确**，依然会执行该 track 的所有回调。即：每个 track 的所有回调至少都会被调用一次，来保证最终结果的正确。

- 请避免 Track 之前相互依赖，如果多个 Track 被跳过，Timeline 将按照 Track 被 add 的顺序依次处理，无法保证不同 Track 之间时间点的顺序正确

- 多线程开发中，OriginTimeline 和 ShadowTimeline 之间的同步会存在延迟(1ms 以内)，如果 ShadowTimeline 被阻塞则会出现两个线程节奏不同步，Timeline 会自动处理节奏不同步的问题，不会造成请求累积，保证最终结果的正确（最近一次指令总会执行），但是会出现<=两帧的延迟。

- 想使用 Tween 的缓动函数？很简单：

```javascript
timeline.addTrack({
	duration: 5000,
	onUpdate: (t, p) => {
		p = TWEEN.Easing.Quadratic.InOut(p)
		div.style.left = `${1000 * p}px`
	},
})

// or

timeline.addTrack({
	duration: 5000,
	easing: TWEEN.Easing.Quadratic.InOut,
	onUpdate: (t, p) => {
		div.style.left = `${1000 * p}px`
	},
})
```

# Proposals

- [ ] 加入循环次数的处理
- [ ] 加入循环间隔的处理
- [ ] 加入缓动函数接口
- [ ] 时间排序
- [ ] 自动排序插入
- [ ] 拆分动作保证顺序
