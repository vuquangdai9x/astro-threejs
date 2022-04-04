const ModifyLevel = {
    TIME: 0,
    SCENARIO: 1,
    LIGHT_CONFIG: 2,
}

const ColorMode = {
    TEMPERATURE: 0,
    RGB_PRESET: 1,
    RGB: 2,
}

var ScenarioData = {
	// sceneEl: null,
	light_definition: null,
	scenario: null,
	timeline: null,
	light_data: [
		{
			isLightOn: {
				modifyLevel: ModifyLevel.TIME,
				value_config: true,
				value_scenario: true,
				value_time: true
			},
			power: {
				modifyLevel: ModifyLevel.TIME,
				value_config: {
					value: 1.0,
					intensity_all: 1.0,
					emissive_intensity_all: 1.0
				},
				value_scenario: {
					value: 1.0,
					intensity_all: 1.0,
					emissive_intensity_all: 1.0
				},
				value_time: {
					value: 1.0,
					intensity_all: 1.0,
					emissive_intensity_all: 1.0
				},
			},
			color: {
				modifyLevel: ModifyLevel.TIME,
				value_config: {
					color_mode: ColorMode.RGB,
					temperature: {
						value: 4000,
						temperature_all: 4000,
						emissive_temperature_all: 4000
					},
					rgb_preset_index: 0,
					rgb_color: "#ffffff"
				},
				value_scenario: {
					color_mode: ColorMode.RGB,
					temperature: {
						value: 4000,
						temperature_all: 4000,
						emissive_temperature_all: 4000
					},
					rgb_preset_index: 0,
					rgb_color: "#ffffff"
				},
				value_time: {
					color_mode: ColorMode.RGB,
					temperature: {
						value: 4000,
						temperature_all: 4000,
						emissive_temperature_all: 4000
					},
					rgb_preset_index: 0,
					rgb_color: "#ffffff"
				},
			}
		}
	],
	timeline_data:{
		sun:{
			position: {
				x: 0,
				y: 0,
				z: 0
			}
		},
		sky:{
			color: "#ffffff"
		},
		other_objects:[
			{
				visible: true,
				position: null,
				rotation: null,
				scale: null
			}
		],
		note: ""
	}
};

var DataManager = {
	isInDefaultScenario: true,
	currentTime: 0,
	/*
	// 	load data
	*/

	loadDataFiles: function(scenarioDataEl, onloadedCallback, onerrorCallback){
		// console.log("DataManager: start: load data files");
		let _self = this;
		_self.readJSONFile(scenarioDataEl.getAttribute("data-light-definition"), 
			function(light_def_text){
				// console.log("DataManager: finish load light-definition files: "+scenarioDataEl.getAttribute("data-light-definition"));
				
				_self.initLightData(light_def_text);
				// console.log("DataManager: finish init list light definition & list light data");

				_self.loadDataFiles_1(scenarioDataEl, onloadedCallback, onerrorCallback);
			},
			function(status_code){
				console.error("DataManager: failed to load light-definition files ("+status_code+"): "+scenarioDataEl.getAttribute("data-light-definition"));
				onerrorCallback();
			}
		);
	},
	loadDataFiles_1: function(scenarioDataEl, onloadedCallback, onerrorCallback){
		let _self = this;
		_self.readJSONFile(scenarioDataEl.getAttribute("data-scenario"), 
			function(scenario_text){
				// console.log("DataManager: finish load scenario files: "+scenarioDataEl.getAttribute("data-scenario"));
				
				_self.initScenarioData(scenario_text);
				// console.log("DataManager: finish init list scenario");

				_self.loadDataFiles_2(scenarioDataEl, onloadedCallback, onerrorCallback);
			},
			function(status_code){
				console.error("DataManager: failed to load scenario files ("+status_code+"): "+scenarioDataEl.getAttribute("data-scenario"));
				onerrorCallback();
			},
		);
	},
	loadDataFiles_2: function(scenarioDataEl, onloadedCallback, onerrorCallback){
		let _self = this;
		_self.readJSONFile(scenarioDataEl.getAttribute("data-timeline"), 
			function(timeline_text){
				// console.log("DataManager: finish load timeline files: "+scenarioDataEl.getAttribute("data-timeline"));
				
				_self.initTimelineData(timeline_text);
				// console.log("DataManager: finish init timeline & timeline data");
				
				onloadedCallback();
			},
			function(status_code){
				console.error("DataManager: failed to load timeline files ("+status_code+"): "+scenarioDataEl.getAttribute("data-timeline"));
				onerrorCallback();
			}
		);
	},

	readJSONFile: function(file, callback, errorCallback=null) {
		var rawFile = new XMLHttpRequest();
		rawFile.overrideMimeType("application/json");
		rawFile.open("GET", file, true);
		rawFile.onreadystatechange = function() {
			if (rawFile.readyState === 4) {
				if (rawFile.status == "200"){
					callback(rawFile.responseText);
				}else{
					if (errorCallback) errorCallback(rawFile.status);
				}
			}
		}
		rawFile.send(null);
	},

	fillDefaultObjectData: function(object, defaultObj){
		let _self = this;
		Object.keys(defaultObj).forEach(function(key) {
			if (object[key]==undefined || object[key]==null){
				object[key] = defaultObj[key];
			}else if (object.constructor === ({}).constructor){
				_self.fillDefaultObjectData(object[key], defaultObj[key]);
			}else{
				// do nothing
			}	
		})
	},

	initLightData: function(text){
		let data_json = JSON.parse(text);
		ScenarioData.light_definition = data_json["lights"];
		// standardize light definition
		for (let i=0; i<ScenarioData.light_definition.length; i++){
			this.fillDefaultObjectData(ScenarioData.light_definition[i], data_json["default-light"]);
		}

		// init light data
		ScenarioData.light_data = [];
		for (let i=0; i<ScenarioData.light_definition.length; i++){
			let data={
				isLightOn: {
					modifyLevel: ModifyLevel.TIME,
					value_config: true,
					value_scenario: false,
					value_time: true
				},
				power: {
					modifyLevel: ModifyLevel.TIME,
					value_config: {
						value: 1.0,
						intensity_all: 1.0,
						emissive_intensity_all: 1.0
					},
					value_scenario: {
						value: 1.0,
						intensity_all: 1.0,
						emissive_intensity_all: 1.0
					},
					value_time: {
						value: 1.0,
						intensity_all: 1.0,
						emissive_intensity_all: 1.0
					},
				},
				color: {
					modifyLevel: ModifyLevel.TIME,
					value_config: {
						color_mode: ColorMode.RGB,
						temperature: {
							value: 4000,
							temperature_all: 4000,
							emissive_temperature_all: 4000
						},
						rgb_preset_index: 0,
						rgb_color: "#ffffff"
					},
					value_scenario: {
						color_mode: ColorMode.RGB,
						temperature: {
							value: 4000,
							temperature_all: 4000,
							emissive_temperature_all: 4000
						},
						rgb_preset_index: 2,
						rgb_color: "#ffffff"
					},
					value_time: {
						color_mode: ColorMode.RGB,
						temperature: {
							value: 4000,
							temperature_all: 4000,
							emissive_temperature_all: 4000
						},
						rgb_preset_index: 0,
						rgb_color: "#ffffff"
					},
				},
			};
			ScenarioData.light_data.push(data);
		}
	},
	initScenarioData: function(text){
		let data_json = JSON.parse(text);
		ScenarioData.scenario = data_json["scenarios"];
		// standardize scenario definition
		for (let i=0; i<ScenarioData.scenario.length; i++){
			this.fillDefaultObjectData(ScenarioData.scenario[i], data_json["default-scenario"]);
		}
	},
	initTimelineData: function(text){
		let data_json = JSON.parse(text);
		ScenarioData.timeline = data_json;

		// init other objects data
		// init light data
		ScenarioData.timeline_data.other_objects = [];
		for (let i=0; i<ScenarioData.timeline["other-objects"].length; i++){
			let data={
				visible: true,
				position: null,
				rotation: null,
				scale: null
			};
			ScenarioData.timeline_data.other_objects.push(data);
		}
	},

	/*
	//	get light values
	*/

	getLightIsOn: function(light_index){
		let light_status_data = ScenarioData.light_data[light_index].isLightOn;
		let value;
		switch (light_status_data.modifyLevel) {
			case ModifyLevel.TIME:
				value = light_status_data.value_time;
				break;
			case ModifyLevel.SCENARIO:
				value = light_status_data.value_scenario;
				break;
			case ModifyLevel.LIGHT_CONFIG:
				value = light_status_data.value_config;
				break;
		}
		return value;
	},
	getLightPower: function(light_index){
		let light_power_data = ScenarioData.light_data[light_index].power;
		let value;
		switch (light_power_data.modifyLevel) {
			case ModifyLevel.TIME:
				value = light_power_data.value_time;
				break;
			case ModifyLevel.SCENARIO:
				value = light_power_data.value_scenario;
				break;
			case ModifyLevel.LIGHT_CONFIG:
				value = light_power_data.value_config;
				break;
		}
		return value;
	},
	getLightColor: function(light_index){
		let light_color_data = ScenarioData.light_data[light_index].color;
		let value;
		switch (light_color_data.modifyLevel) {
			case ModifyLevel.TIME:
				value = light_color_data.value_time;
				break;
			case ModifyLevel.SCENARIO:
				value = light_color_data.value_scenario;
				break;
			case ModifyLevel.LIGHT_CONFIG:
				value = light_color_data.value_config;
				break;
		}
		return value;
	},

	/*
	// set light value manually
	*/

	updateLightPowerDataBlock: function(power_data_block, def_block, power){
		let lerpValue = (power-def_block.min["value"])/(def_block.max["value"]-def_block.min["value"]);

		power_data_block.value = power;
		
		power_data_block.intensity_all = lerpFloat(
			def_block.min["config-intensity-all"],
			def_block.max["config-intensity-all"],
			lerpValue
		);

		if (def_block.min["config-intensity"] && def_block.max["config-intensity"]){
			power_data_block.intensity = [];
			for (let i=0; i<def_block.min["config-intensity"].length; i++){
				power_data_block.intensity.push(
					lerpFloat(
						def_block.min["config-intensity"][i],
						def_block.max["config-intensity"][i],
						lerpValue
					)
				);
			}
		}else{
			power_data_block.intensity = null;
		}

		power_data_block.emissive_intensity_all = lerpFloat(
			def_block.min["config-emissive-intensity-all"],
			def_block.max["config-emissive-intensity-all"],
			lerpValue
		);

		if (def_block.min["config-emissive-intensity"] && def_block.max["config-emissive-intensity"]){
			power_data_block.emissive_intensity = [];
			for (let i=0; i<def_block.min["config-emissive-intensity"].length; i++){
				power_data_block.emissive_intensity.push(
					lerpFloat(
						def_block.min["config-emissive-intensity"][i],
						def_block.max["config-emissive-intensity"][i],
						lerpValue
					)
				);
			}
		}else{
			power_data_block.emissive_intensity = null;
		}
	},
	updateColorTemperatureDataBlock: function(temperature_data_block, def_block, temperature){
		let lerpValue = (temperature-def_block.min["value"])/(def_block.max["value"]-def_block.min["value"]);

		temperature_data_block.value = temperature;
		
		temperature_data_block.temperature_all = lerpFloat(
			def_block.min["config-temperature-all"],
			def_block.max["config-temperature-all"],
			lerpValue
		);

		if (def_block.min["config-temperature"] && def_block.max["config-temperature"]){
			temperature_data_block.temperature = [];
			for (let i=0; i<def_block.min["config-temperature"].length; i++){
				temperature_data_block.temperature.push(
					lerpFloat(
						def_block.min["config-temperature"][i],
						def_block.max["config-temperature"][i],
						lerpValue
					)
				);
			}
		}else{
			temperature_data_block.temperature = null;
		}

		temperature_data_block.emissive_temperature_all = lerpFloat(
			def_block.min["config-emissive-temperature-all"],
			def_block.max["config-emissive-temperature-all"],
			lerpValue
		);

		if (def_block.min["config-emissive-temperature"] && def_block.max["config-emissive-temperature"]){
			temperature_data_block.emissive_temperature = [];
			for (let i=0; i<def_block.min["config-emissive-temperature"].length; i++){
				temperature_data_block.emissive_temperature.push(
					lerpFloat(
						def_block.min["config-emissive-temperature"][i],
						def_block.max["config-emissive-temperature"][i],
						lerpValue
					)
				);
			}
		}else{
			temperature_data_block.emissive_temperature = null;
		}
	},

	setLightIsOnManuallyAll: function(isTurnOn){
		for (let i=0; i<ScenarioData.light_definition.length; i++){
			if (ScenarioData.light_definition[i]["allow_config_manually"]){
				this.setLightIsOnManually(i, isTurnOn);
			}
		}
	},
	setLightIsOnManually: function(light_index, isTurnOn){
		let light_status_data = ScenarioData.light_data[light_index].isLightOn;
		if (light_status_data.modifyLevel < ModifyLevel.LIGHT_CONFIG){
			light_status_data.modifyLevel = ModifyLevel.LIGHT_CONFIG;
		}
		light_status_data.value_config = isTurnOn;
	},
	setLightPowerManually: function(light_index, power){
		let light_power_data = ScenarioData.light_data[light_index].power;
		if (light_power_data.modifyLevel < ModifyLevel.LIGHT_CONFIG){
			light_power_data.modifyLevel = ModifyLevel.LIGHT_CONFIG;
		}
		this.updateLightPowerDataBlock(light_power_data.value_config, ScenarioData.light_definition[light_index].power, power);
	},
	setLightColorManually: function(light_index, color_mode, value){
		let light_color_data = ScenarioData.light_data[light_index].color;
		if (light_color_data.modifyLevel < ModifyLevel.LIGHT_CONFIG){
			light_color_data.modifyLevel = ModifyLevel.LIGHT_CONFIG;
		}
		light_color_data.value_config.color_mode = color_mode;
		let colorDef = ScenarioData.light_definition[light_index].color;
		switch (color_mode) {
			case ColorMode.TEMPERATURE:
				this.updateColorTemperatureDataBlock(
					light_color_data.value_config.temperature,
					colorDef.temperature,
					value
				);
				light_color_data.value_config.rgb_color = getColorFromTemperature(value);
				break;
			case ColorMode.RGB_PRESET:
				light_color_data.value_config.rgb_preset_index = value;
				light_color_data.value_config.rgb_color = colorDef["list-rgb"][value];
				break;
			case ColorMode.RGB:
				light_color_data.value_config.rgb_color = value;
				break;
		}
	},
	resetLightStatus: function(light_index){
		let lightData = ScenarioData.light_data[light_index];
		if (lightData){
			if (lightData.isLightOn.modifyLevel == ModifyLevel.LIGHT_CONFIG){
				lightData.isLightOn.modifyLevel=this.isInDefaultScenario?ModifyLevel.TIME:ModifyLevel.SCENARIO;
			}
		}
	},
	resetLightPower: function(light_index){
		let lightData = ScenarioData.light_data[light_index];
		if (lightData){
			if (lightData.power.modifyLevel == ModifyLevel.LIGHT_CONFIG){
				lightData.power.modifyLevel=this.isInDefaultScenario?ModifyLevel.TIME:ModifyLevel.SCENARIO;
			}
		}
	},
	resetLightColor: function(light_index){
		let lightData = ScenarioData.light_data[light_index];
		if (lightData){
			if (lightData.color.modifyLevel == ModifyLevel.LIGHT_CONFIG){
				lightData.color.modifyLevel=this.isInDefaultScenario?ModifyLevel.TIME:ModifyLevel.SCENARIO;
			}
		}
	},
	resetLight: function(light_index){ // lower light modify level
		this.resetLightPower(light_index);
		this.resetLightStatus(light_index);
		this.resetLightColor(light_index);
	},
	resetAllLight: function(){
		for (let i=0; i<ScenarioData.light_definition.length; i++){
			if (ScenarioData.light_definition[i]["allow_config_manually"]){
				this.resetLight(i);
			}
		}
	},

	/*
	// set scenario
	*/

	setScenario: function(scenario_index){
		// reset modifyLevel of lights to TIME if it is SCENARIO
		for (let i=0; i<ScenarioData.light_data.length; i++){
			let lightData = ScenarioData.light_data[i];
			if (lightData.isLightOn.modifyLevel == ModifyLevel.SCENARIO){
				lightData.isLightOn.modifyLevel = ModifyLevel.TIME;
			}
			if (lightData.power.modifyLevel == ModifyLevel.SCENARIO){
				lightData.power.modifyLevel = ModifyLevel.TIME;
			}
			if (lightData.color.modifyLevel == ModifyLevel.SCENARIO){
				lightData.color.modifyLevel = ModifyLevel.TIME;
			}
		}
		if (scenario_index <= 0 || scenario_index >= ScenarioData.scenario.length){
			// default scenario
			this.isInDefaultScenario = true;
		}else{
			this.setTime(ScenarioData.scenario[scenario_index].time);
			let listLightInScenario = ScenarioData.scenario[scenario_index].lights;
			for (let i=0; i<listLightInScenario.length; i++){
				let lightData = ScenarioData.light_data[listLightInScenario[i].index];
				let lightDef = ScenarioData.light_definition[listLightInScenario[i].index];
				if (lightData){
					if (listLightInScenario[i].turnOn){
						if (lightData.isLightOn.modifyLevel < ModifyLevel.SCENARIO){
							lightData.isLightOn.modifyLevel = ModifyLevel.SCENARIO;
						}
						lightData.isLightOn.value_scenario = listLightInScenario[i].turnOn;
					}
					if (listLightInScenario[i].power){
						if (lightData.power.modifyLevel < ModifyLevel.SCENARIO){
							lightData.power.modifyLevel = ModifyLevel.SCENARIO;
						}
						this.updateLightPowerDataBlock(
							lightData.power.value_scenario, 
							lightDef.power, 
							listLightInScenario[i].power
						);
					}
					if (listLightInScenario[i].color){
						if (lightData.color.modifyLevel < ModifyLevel.SCENARIO){
							lightData.color.modifyLevel = ModifyLevel.SCENARIO;
						}
						switch (listLightInScenario[i].color.color_mode) {
							case "temperature":
								lightData.color.value_scenario.color_mode = ColorMode.TEMPERATURE;
								this.updateColorTemperatureDataBlock(
									lightData.color.value_scenario.temperature,
									lightDef.color.temperature,
									listLightInScenario[i].color["temperature"]
								);
								lightData.color.value_scenario.rgb_color = getColorFromTemperature(listLightInScenario[i].color["temperature"]);
								break;
							case "rgb-preset":
								lightData.color.value_scenario.color_mode = ColorMode.RGB_PRESET;
								lightData.color.value_scenario.rgb_preset_index = listLightInScenario[i].color["rgb-preset-index"];
								lightData.color.value_scenario.rgb_color = lightDef.color["list-rgb"][listLightInScenario[i].color["rgb-preset-index"]];
								break;
							case "rgb":
								lightData.color.value_scenario.color_mode = ColorMode.RGB;
								lightData.color.value_scenario.rgb_color = listLightInScenario[i].color["rgb"];
								break;
						}
					}
				}
			}
		}
	},

	/*
	// set time
	*/

	setTime: function(time){
		this.currentTime = time;
		this.updateSunByTime(time);
		this.updateSkyByTime(time);
		this.updateOtherObjectsByTime(time);
		this.updateLightByTime(time);
		this.updateNoteByTime(time);
	},

	getLerpValueByTime: function(time, timeline){
		let result = {};
		if (timeline.length == 0){
			return null;
		}else if (timeline.length == 1){
			result.prev = timeline[0];
			result.next = timeline[0];
			result.lerpValue = 0;
		}else{
			let prev, next, lerpValue;
			if (time <= timeline[0].time){
				prev = timeline[timeline.length-1];
				next = timeline[0];
				lerpValue = (time+24000-prev.time)/(next.time+24000-prev.time);
			}else if (time >= timeline[timeline.length-1].time){
				prev = timeline[timeline.length-1];
				next = timeline[0];
				lerpValue = (time-prev.time)/(next.time+24000-prev.time);
			}else{
				for(let i = 1; i < timeline.length; i++) {
					if (time <= timeline[i].time){
						prev = timeline[i-1];
						next = timeline[i];
						lerpValue = (time-prev.time)/(next.time-prev.time);
						break;
					}
				}
			}
			result.prev = prev;
			result.next = next;
			result.lerpValue = lerpValue;
		}
		return result;
	},

	updateSunByTime: function(time){
		let lerpResult = this.getLerpValueByTime(time, ScenarioData.timeline.sun.timeline);
		if (lerpResult == null){
			// do nothing, keep sun position when init scene
		}else{
			let r = ScenarioData.timeline.sun.distance;
			let phi = ScenarioData.timeline.sun.delta_phi * Math.PI / 180.0;
			let angle;

			// standalize angle values
			let prevAngle = lerpResult.prev.angle;
			let nextAngle = lerpResult.next.angle;
			if (lerpResult.next.clockwise){
				// clockwise, nextAngle must less than prevAngle
				while (nextAngle > prevAngle){
					nextAngle -= 360;
				}
				while (prevAngle - nextAngle >= 360){
					nextAngle += 360;
				}
			}else{
				// counter clockwise, nextAngle must greater than prevAngle
				while (nextAngle < prevAngle){
					nextAngle += 360;
				}
				while (nextAngle - prevAngle >= 360){
					prevAngle += 360;
				}
			}

			// update angle
			angle = lerpFloat(prevAngle,nextAngle,lerpResult.lerpValue);
			angle = angle * Math.PI / 180.0;
			
			ScenarioData.timeline_data.sun.position = {
				x: r * Math.cos(angle) * Math.cos(phi),
				y: r * Math.sin(angle),
				z: r * Math.cos(angle) * Math.sin(phi)
			}
		}	
	},

	updateSkyByTime: function(time){
		let color;
		let lerpResult = this.getLerpValueByTime(time, ScenarioData.timeline.sky.timeline);
		if (lerpResult == null){
			color = "#ffffff";
		}else{
			color = lerpColor(lerpResult.prev.color, lerpResult.next.color, lerpResult.lerpValue);
		}	
		ScenarioData.timeline_data.sky.color = color;
	},

	updateOtherObjectsByTime: function(time){
		let listObjData = ScenarioData.timeline_data.other_objects;
		for (let i = 0; i<listObjData.length; i++){
			let lerpResult = this.getLerpValueByTime(time, ScenarioData.timeline["other-objects"][i].timeline);
			if (lerpResult == null){
				// do nothing
			}else{
				listObjData[i].visible = lerpResult.next.visible;
				listObjData[i].position = 
					(lerpResult.next.position != null && lerpResult.prev.position != null) ?
					lerpVector3(lerpResult.prev.position, lerpResult.next.position, lerpResult.lerpValue, false)
					: null;

				listObjData[i].rotation = 
					(lerpResult.next.rotation != null && lerpResult.prev.rotation != null) ?
					lerpVector3(lerpResult.prev.rotation, lerpResult.next.rotation, lerpResult.lerpValue, false)
					: null;

				listObjData[i].scale = 
					(lerpResult.next.scale != null && lerpResult.prev.scale != null) ?
					lerpVector3(lerpResult.prev.scale, lerpResult.next.scale, lerpResult.lerpValue, false)
					: null;
			}	
		}
	},

	updateLightByTime: function(time){
		let listLightInTimeline = ScenarioData.timeline["lights"];
		for (let i = 0; i<listLightInTimeline.length; i++){
			let lightData = ScenarioData.light_data[listLightInTimeline[i].index];
			let lightDefinition = ScenarioData.light_definition[listLightInTimeline[i].index];

			let lerpResult = this.getLerpValueByTime(time, listLightInTimeline[i].timeline);
			if (lerpResult == null){
				// do nothing
			}else{
				lightData.isLightOn.value_time = lerpResult.next.turnOn;

				this.updateLightPowerDataBlock(
					lightData.power.value_time, 
					lightDefinition.power, 
					lerpFloat(lerpResult.prev.power, lerpResult.next.power, lerpResult.lerpValue)
				);
				
				if (lerpResult.prev.color["type"]==lerpResult.next.color["type"]){
					switch (lerpResult.prev.color["type"]) {
						case "temperature":
							lightData.color.value_time.color_mode = ColorMode.TEMPERATURE;
							let temperatureValue = lerpFloat(
								lerpResult.prev.color["temperature"], 
								lerpResult.next.color["temperature"],
								lerpResult.lerpValue
							);
							this.updateColorTemperatureDataBlock(
								lightData.color.value_time.temperature,
								lightDefinition.color.temperature,
								temperatureValue
							);
							lightData.color.value_time.rgb_color = getColorFromTemperature(temperatureValue);
							break;
						case "preset":
							lightData.color.value_time.color_mode = ColorMode.RGB_PRESET;
							lightData.color.value_time.rgb_preset_index = lerpResult.next.color["preset-index"];
							lightData.color.value_time.rgb_color = lightDefinition.color["list-rgb"][lerpResult.next.color["preset-index"]];
							break;
						case "rgb":
							lightData.color.value_time.color_mode = ColorMode.RGB;
							lightData.color.value_time.rgb_color = lerpColor(
								lerpResult.prev.color["rgb"], 
								lerpResult.next.color["rgb"],
								lerpResult.lerpValue);
							break;
					}
				}else{
					// NOTE: avoid that flow. Light should only use TEMPERATURE, RGB_PRESET or RGB
					let colorPrev, colorNext;
					switch (lerpResult.prev.color["type"]) {
						case "temperature":
							colorPrev = getColorFromTemperature(lerpResult.prev.color["temperature"]);
							break;
						case "preset":
							colorPrev = lightDefinition.color["list-rgb"][lerpResult.prev.color["preset-index"]];
							break;
						case "rgb":
							colorPrev = lerpResult.prev.color["rgb"];
							break;
					}
					switch (lerpResult.next.color["type"]) {
						case "temperature":
							colorNext = getColorFromTemperature(lerpResult.next.color["temperature"]);
							break;
						case "preset":
							colorNext = lightDefinition.color["list-rgb"][lerpResult.next.color["preset-index"]];
							break;
						case "rgb":
							colorNext = lerpResult.next.color["rgb"];
							break;
					}
					lightData.color.value_time.color_mode = ColorMode.RGB;
					lightData.color.value_time.rgb_color = lerpColor(colorPrev, colorNext, lerpResult.lerpValue);
				}
			}
		}
	},

	updateNoteByTime: function(time){
		let listNote = ScenarioData.timeline.note;
		let noteIndex1, noteIndex2;
		if (time < listNote[0].time || time > listNote[listNote.length-1].time){
			noteIndex1 = listNote.length-1;
			noteIndex2 = 0;
		}else{
			for (let i=1; i<listNote.length; i++){
				if (listNote[i-1].time <= time && time <= listNote[i].time){
					noteIndex1 = i-1;
					noteIndex2 = i; 
					break;
				}
			}
		}
		ScenarioData.timeline_data.note = "<b>" + getTimeStringFromValue(listNote[noteIndex1].time) + "</b>" + ": " + listNote[noteIndex1].text
						+ "<br>"
						+ "<b>" + getTimeStringFromValue(listNote[noteIndex2].time) + "</b>"  + ": " + listNote[noteIndex2].text;
	}
}