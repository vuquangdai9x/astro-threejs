AFRAME.registerComponent('update-shadowmap-when-loaded', {
	init: function () {
		var _self = this;
		this.el.addEventListener('loaded', function () {
			// console.log("loaded");
			_self.el.sceneEl.renderer.shadowMap.needsUpdate = true;
		});
		this.el.addEventListener('model-loaded', function () {
			// console.log("model-loaded");
			_self.el.sceneEl.renderer.shadowMap.needsUpdate = true;
		});
	},
});

AFRAME.registerComponent('update-shadowmap-on-change-prop', {
	init: function () {
		var _self = this;
		this.el.addEventListener('componentchanged', function () {
			_self.el.sceneEl.renderer.shadowMap.needsUpdate = true;
		});
	},
});

AFRAME.registerComponent('click-to-toggle-light', {
	schema: {
		lightOn: {type: 'boolean', default: true},
		targetLight: {type: 'selectorAll'},
	},
	init: function () {
		var _self = this;
		let isLightOn = this.data.lightOn;
		// console.log(this.data.targetLight.length);
		for (var i = 0; i < this.data.targetLight.length; i++) {
			this.data.targetLight[i].setAttribute("visible", isLightOn);
		}
		_self.el.setAttribute("material", {
			'emissiveIntensity': (isLightOn?1.0:0.0)
		});
		this.el.addEventListener('click', function () {
			_self.toggleLight();
		});
	},
	toggleLight: function() {
		let isLightOn = !this.data.lightOn;
		this.data.lightOn = isLightOn;
		for (var i = 0; i < this.data.targetLight.length; i++) {
			this.data.targetLight[i].setAttribute("visible", isLightOn);
		}
		this.el.setAttribute("material", {
			'emissiveIntensity': (isLightOn?1.0:0.0)
		});
	}
});

var temp_color_map = [
		{
			"name": "Darkness",
			"temp": 0,
			"rgb": "#000000"
		},
		{
			"name": "Candle",
			"temp": 1900,
			"rgb": "#ff9329"
		},
		{
			"name": "40W Tungsten",
			"temp": 2600,
			"rgb": "#ffc58f"
		},
		{
			"name": "100W Tungsten",
			"temp": 2850,
			"rgb": "#ffd6aa"
		},
		{
			"name": "Halogen",
			"temp": 3200,
			"rgb": "#fff1e0"
		},
		{
			"name": "Carbon Arc",
			"temp": 5200,
			"rgb": "#fffaf4"
		},
		{
			"name": "High Noon Sun",
			"temp": 5400,
			"rgb": "#fffffb"
		},
		{
			"name": "Direct Sunlight",
			"temp": 6000,
			"rgb": "#ffffff"
		}
	];

AFRAME.registerComponent('light-temperature', {
	schema: {
		temperature: {type: 'int', default: 6000},
	},
	init: function () {
		this.temp_color_map = temp_color_map;
	},
	update: function(oldData) {
		let lerpValue, color;
		if (this.data.temperature < this.temp_color_map[0].temp){
			color = this.temp_color_map[0].rgb;
		}
		else if (this.data.temperature >= this.temp_color_map[this.temp_color_map.length-1].temp){
			color = this.temp_color_map[this.temp_color_map.length-1].rgb;
		}
		else{
			for (let i=1; i<this.temp_color_map.length; i++){
				if (this.temp_color_map[i-1].temp <= this.data.temperature && this.data.temperature <= this.temp_color_map[i].temp){
					lerpValue = (this.data.temperature - this.temp_color_map[i-1].temp)/(this.temp_color_map[i].temp - this.temp_color_map[i-1].temp);
					color = this.lerpColor(this.temp_color_map[i-1].rgb,this.temp_color_map[i].rgb,lerpValue);
					break;
				}
			}
		}
		this.el.setAttribute("light", "color", color);
	},
	lerpColor: function(a, b, amount) {
		var ah = parseInt(a.replace(/#/g, ''), 16),
			ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
			bh = parseInt(b.replace(/#/g, ''), 16),
			br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
			rr = ar + amount * (br - ar),
			rg = ag + amount * (bg - ag),
			rb = ab + amount * (bb - ab);
		return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
	}
});
AFRAME.registerComponent('emissive-temperature', {
	schema: {
		temperature: {type: 'int', default: 6000},
	},
	init: function () {
		this.temp_color_map = temp_color_map;
	},
	update: function(oldData) {
		let lerpValue, color;
		if (this.data.temperature < this.temp_color_map[0].temp){
			color = this.temp_color_map[0].rgb;
		}
		else if (this.data.temperature >= this.temp_color_map[this.temp_color_map.length-1].temp){
			color = this.temp_color_map[this.temp_color_map.length-1].rgb;
		}
		else{
			for (let i=1; i<this.temp_color_map.length; i++){
				if (this.temp_color_map[i-1].temp <= this.data.temperature && this.data.temperature <= this.temp_color_map[i].temp){
					lerpValue = (this.data.temperature - this.temp_color_map[i-1].temp)/(this.temp_color_map[i].temp - this.temp_color_map[i-1].temp);
					color = this.lerpColor(this.temp_color_map[i-1].rgb,this.temp_color_map[i].rgb,lerpValue);
					break;
				}
			}
		}
		this.el.setAttribute("material", "emissive", color);
	},
	lerpColor: function(a, b, amount) {
		var ah = parseInt(a.replace(/#/g, ''), 16),
			ar = ah >> 16, ag = ah >> 8 & 0xff, ab = ah & 0xff,
			bh = parseInt(b.replace(/#/g, ''), 16),
			br = bh >> 16, bg = bh >> 8 & 0xff, bb = bh & 0xff,
			rr = ar + amount * (br - ar),
			rg = ag + amount * (bg - ag),
			rb = ab + amount * (bb - ab);
		return '#' + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
	}
});