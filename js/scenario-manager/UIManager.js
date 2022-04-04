var UIManager = {
	debug: false,
	selectedScenarioIndex: -1, 
	selectedLightIndex: -1,
	mappingUI: function(){
		this.elementUI = {
			light:{
				menu: document.querySelector("#list-light-group > div"),
				name: document.querySelector("#light-group-info > h3"),
				description: document.querySelector("#light-group-description"),
				status_btn: document.querySelector("#light-group-info button :first-child"),
				power:{
					value: document.querySelector("#config-light-power > p"),
					slider: document.querySelector("#config-light-power > input")
				},
				color:{
					preview: document.querySelector("#light-color-preview"),
					temperature: {
						container: document.querySelector("#config-light-temperature"),
						slider: document.querySelector("#config-light-temperature > input")
					},
					preset: {
						container: document.querySelector("#config-light-color-rgb"),
						selectColorDirectly: document.querySelector("#config-light-color-rgb > label"),
						list: []
					}
				}
			},
			scenario:{
				menu: document.querySelector("#list-scenario"),
				name: document.querySelector("#config-scenario > h3"),
				description: document.querySelector("#config-scenario > p"),
			},
			time:{
				inputDirectly: document.querySelector("#input-time > input"),
				slider: document.querySelector("#input-time-slider > input"),
				note: document.querySelector("#time-description")
			},
			debug:{
				log: document.querySelector("#debug")
			}
		};
	},

	initUI: function(){
		this.mappingUI();
		this.elementUI.debug.log.hidden = !this.debug;

		// set up list light menu
		for (let i=0; i<ScenarioData.light_definition.length; i++){
			if (! ScenarioData.light_definition[i]["allow_config_manually"]) continue;

			let button = document.createElement("button");
			let imgUrl = ScenarioData.light_definition[i].img;
			button.style.backgroundImage = "url("+imgUrl+")";
			button.addEventListener("click", ()=>{UIManager.selectLight(i);});
			button.addEventListener("mouseenter", ()=>{UIManager.updateLightUI(i);});
			button.addEventListener("mouseleave", ()=>{UIManager.updateLightUI(UIManager.selectedLightIndex);});
			button.classList.add("button-hover-fade");
			this.elementUI.light.menu.appendChild(button);

			// set up list color preset
			let listColorPresetEl = document.createElement("div");
			let listColorPresetData = ScenarioData.light_definition[i].color["list-rgb"];
			for (let j=0; j<listColorPresetData.length; j++){
				let colorItem = document.createElement("button");
				colorItem.style.backgroundColor = listColorPresetData[j];
				colorItem.classList.add("button-hover-fade");
				colorItem.addEventListener("click", ()=>{UIManager.setLightColorPreset(j);});
				colorItem.addEventListener("mouseenter", ()=>{});
				colorItem.addEventListener("mouseleave", ()=>{});
				listColorPresetEl.appendChild(colorItem);
			}
			this.elementUI.light.color.preset.container.appendChild(listColorPresetEl);
			this.elementUI.light.color.preset.list.push(listColorPresetEl);
		}

		// set up list light scenario
		for (let i=0; i<ScenarioData.scenario.length; i++){
			let button = document.createElement("button");
			let imgUrl = ScenarioData.scenario[i].img;
			button.style.backgroundImage = "url("+imgUrl+")";
			button.addEventListener("click", ()=>{UIManager.selectScenario(i);});
			button.addEventListener("mouseenter", ()=>{UIManager.updateScenarioUI(i);});
			button.addEventListener("mouseleave", ()=>{UIManager.updateScenarioUI(UIManager.selectedScenarioIndex);});
			button.classList.add("button-hover-fade");
			this.elementUI.scenario.menu.appendChild(button);
		}

		this.selectLight(0);
		this.selectScenario(0);
		this.setCurrentTime();
	},

	toggleDebug: function(){
		this.debug = !this.debug;
		this.elementUI.debug.log.hidden = !this.debug;
		this.updateDebugLog();
	},

	updateDebugLog: function(){
		if (!this.debug) return;

		let lightData = ScenarioData.light_data[this.selectedLightIndex];
		let str = "";
		str += "<p><b>" + ScenarioData.light_definition[this.selectedLightIndex].name + "</b></p>";

		str += "<p>";
		switch (lightData.isLightOn.modifyLevel) {
			case ModifyLevel.TIME:
				str += "TurnOn modifyLevel: Time";
				break;
			case ModifyLevel.SCENARIO:
				str += "TurnOn modifyLevel: Scenario";
				break;
			case ModifyLevel.LIGHT_CONFIG:
				str += "TurnOn modifyLevel: Config";
				break;
		}
		str += "</p>";
		str += "<pre>" + JSON.stringify(DataManager.getLightIsOn(this.selectedLightIndex), undefined, 3) + "</pre>";

		str += "<p>";
		switch (lightData.power.modifyLevel) {
			case ModifyLevel.TIME:
				str += "Power modifyLevel: Time";
				break;
			case ModifyLevel.SCENARIO:
				str += "Power modifyLevel: Scenario";
				break;
			case ModifyLevel.LIGHT_CONFIG:
				str += "Power modifyLevel: Config";
				break;
		}
		str += "</p>";
		str += "<pre>" + JSON.stringify(DataManager.getLightPower(this.selectedLightIndex), undefined, 3) + "</pre>";

		str += "<p>";
		switch (lightData.color.modifyLevel) {
			case ModifyLevel.TIME:
				str += "Color modifyLevel: Time";
				break;
			case ModifyLevel.SCENARIO:
				str += "Color modifyLevel: Scenario";
				break;
			case ModifyLevel.LIGHT_CONFIG:
				str += "Color modifyLevel: Config";
				break;
		}
		str += "</p>";
		str += "<pre>" + JSON.stringify(DataManager.getLightColor(this.selectedLightIndex), undefined, 3) + "</pre>";

		this.elementUI.debug.log.innerHTML = str;
	},

	/*
	//	time selection
	*/

	setTime: function(time){
		if (!isNaN(time))
		{
			// ok
		}else if (time.match(/^\d{1,2}(:\d{1,2}){1,2}$/)){
			let time_splitted = time.split(":", 3);
			time = (parseInt(time_splitted[0])+parseInt(time_splitted[1])/60)*1000;
		}
		time = time % 24000;
		time = parseInt(time);

		DataManager.setTime(time);
		SceneManager.updateAll();

		this.updateTimeUI();
		this.updateLightUI(this.selectedLightIndex);
	},

	updateTimeUI: function(){
		this.elementUI.time.inputDirectly.value = getTimeStringFromValue(DataManager.currentTime,1);
		this.elementUI.time.slider.value = DataManager.currentTime;
		this.elementUI.time.note.innerHTML = ScenarioData.timeline_data.note;
	},

	setCurrentTime: function(){
		let today = new Date();
		let time = (parseInt(today.getHours()) + parseInt(today.getMinutes()) / 60) * 1000;
		time = parseInt(time);
		this.setTime(time);
	},

	/*
	//	scenario selection
	*/

	// trigger when user click on scenario image
	selectScenario: function(index){
		if (index < 0 || index >= ScenarioData.scenario.length) index=0;
		this.selectedScenarioIndex = index;
		
		DataManager.setScenario(index);
		SceneManager.updateAll();

		this.updateScenarioUI(index);
		this.updateTimeUI();
		this.updateLightUI(this.selectedLightIndex);
	},

	// trigger when user hover on scenario image, or when select scenario
	updateScenarioUI: function(index){
		this.elementUI.scenario.name.innerHTML = ScenarioData.scenario[index].name;
		this.elementUI.scenario.description.innerHTML = ScenarioData.scenario[index].description;
	},

	/*
	//	light global config
	*/
	setStatusAllLight: function(isTurnOn){
		DataManager.setLightIsOnManuallyAll(isTurnOn);
		SceneManager.updateAllLight();
		this.updateLightUI(this.selectedLightIndex);
	},

	resetAllLight: function(){
		DataManager.resetAllLight();
		SceneManager.updateAllLight();
		this.updateLightUI(this.selectedLightIndex);
	},

	/*
	//	light selection & preview
	*/

	// trigger when user click on light image
	selectLight: function(index){
		if (index < 0 || index >= ScenarioData.light_data.length) return;
		this.selectedLightIndex = index;
		this.updateLightUI(index);
	},

	// trigger when user hover on light image, or when select light
	updateLightUI: function(index){
		let lightDef = ScenarioData.light_definition[index];
		let lightData = ScenarioData.light_data[index];

		// light info
		this.elementUI.light.name.innerHTML = lightDef.name;
		this.elementUI.light.description.innerHTML = lightDef.description;

		this.updateLightStatusUI(index);
		this.updateLightPowerUI(index);
		this.updateLightColorUI(index);
	},

	updateLightStatusUI: function(index){
		// light status (on/off)
		if (DataManager.getLightIsOn(index)){
			this.elementUI.light.status_btn.classList.remove("lightbulb-off");
			this.elementUI.light.status_btn.classList.add("lightbulb-on");
		}else{
			this.elementUI.light.status_btn.classList.add("lightbulb-off");
			this.elementUI.light.status_btn.classList.remove("lightbulb-on");
		}

		this.updateDebugLog();
	},
	updateLightPowerUI: function(index){
		let lightDef = ScenarioData.light_definition[index];
		let lightPower = DataManager.getLightPower(index);
		this.elementUI.light.power.value.innerHTML = parseInt(lightPower.value*100) + "%";
		this.elementUI.light.power.slider.min = lightDef.power.min.value;
		this.elementUI.light.power.slider.max = lightDef.power.max.value;
		this.elementUI.light.power.slider.value = lightPower.value;

		this.updateDebugLog();
	},
	updateLightColorUI: function(index){
		let lightDef = ScenarioData.light_definition[index];
		let lightColorData = DataManager.getLightColor(index);

		this.elementUI.light.color.preview.style.backgroundColor = lightColorData.rgb_color;

		this.elementUI.light.color.temperature.container.hidden = !lightDef.color["use-temperature"];
		this.elementUI.light.color.temperature.slider.min = lightDef.color.temperature.min.value;
		this.elementUI.light.color.temperature.slider.max = lightDef.color.temperature.max.value;
		this.elementUI.light.color.temperature.slider.value = lightColorData.temperature.value;

		this.elementUI.light.color.preset.container.hidden = !lightDef.color["use-rgb"];

		for (let i=0; i<this.elementUI.light.color.preset.list.length; i++){
			this.elementUI.light.color.preset.list[i].hidden = !(i==index);
		}

		this.elementUI.light.color.preset.selectColorDirectly.hidden = !lightDef.color["allow-select-rgb"];

		this.updateDebugLog();
	},

	
	/*
	//	light config
	*/
	toggleLightStatus: function(){
		let isLightOn = DataManager.getLightIsOn(this.selectedLightIndex);
		this.setLightStatus(!isLightOn);
	},
	setLightStatus: function(isOn){
		DataManager.setLightIsOnManually(this.selectedLightIndex, isOn);
		SceneManager.updateLight(this.selectedLightIndex);
		this.updateLightStatusUI(this.selectedLightIndex);
	},

	resetLight: function(){
		DataManager.resetLight(this.selectedLightIndex);
		SceneManager.updateLight(this.selectedLightIndex);
		this.updateLightUI(this.selectedLightIndex);
	},
	
	setLightPower: function(power){
		DataManager.setLightPowerManually(this.selectedLightIndex, power);
		SceneManager.updateLightPower(this.selectedLightIndex);
		this.updateLightPowerUI(this.selectedLightIndex);
	},

	setLightTemperature: function(temperature){
		DataManager.setLightColorManually(this.selectedLightIndex, ColorMode.TEMPERATURE, temperature);
		SceneManager.updateLightColor(this.selectedLightIndex);
		this.updateLightColorUI(this.selectedLightIndex);
	},
	setLightColorPreset: function(preset_index){
		DataManager.setLightColorManually(this.selectedLightIndex, ColorMode.RGB_PRESET, preset_index);
		SceneManager.updateLightColor(this.selectedLightIndex);
		this.updateLightColorUI(this.selectedLightIndex);
	},
	setLightColorRGB: function(color){
		DataManager.setLightColorManually(this.selectedLightIndex, ColorMode.RGB, color);
		SceneManager.updateLightColor(this.selectedLightIndex);
		this.updateLightColorUI(this.selectedLightIndex);
	}
}