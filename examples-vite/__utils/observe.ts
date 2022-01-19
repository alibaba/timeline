interface Observer {
	obj: any
	key: any
	oldValue: any
	onChange: any
}

const observers = [] as Array<Observer | null>

function tick() {
	requestIdleCallback(tick, { timeout: 17 })

	observers.forEach((observer) => {
		if (observer === null) {
			return
		}

		const newValue = observer.obj[observer.key]
		if (newValue !== observer.oldValue) {
			observer.onChange(newValue, observer.oldValue, observer.obj, observer.key)
			observer.oldValue = newValue
		}
	})
}

tick()

export function observe<T extends object, K extends keyof T>(
	obj: T,
	key: K,
	onChange: (newValue: T[K], oldValue: T[K], obj: T, key: K) => void
): number {
	const observer: Observer = {
		obj,
		key,
		oldValue: obj[key] === undefined ? null : undefined, // try to fire the first one immediately
		onChange,
	}

	observers.push(observer)
	return observers.length - 1
}

export function stopObserve(id: number) {
	observers[id] = null
}
