'use strict';

/* ----------------------------------------------------------------------------------------------------*/
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coor, distance, duration) {
    this.coor = coor; // [lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coor, distance, duration, cadence) {
    super(coor, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this.setDescription();
  }

  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1);
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coor, distance, duration, elevationGain) {
    super(coor, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.setDescription();
  }

  calcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);
    return this.speed;
  }
}

/* ----------------------------------------------------------------------------------------------------*/

// Application Architecture
const form = document.querySelector('.form');
const sortType = document.querySelector('.sort_types_selector');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAll = document.querySelector('.del-button');

class App {
  #map;
  #markers = [];
  #zoomlevel = 13;
  #mapEvent;
  #workouts = [];
  #workoutElId;

  constructor() {
    // get users position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    // Attaching event handlers
    inputType.addEventListener('change', this._toggleElevationField);
    form.addEventListener('submit', this._newWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._moveToView.bind(this));
    deleteAll.addEventListener('click', this._deleteAll.bind(this));
  }

  _getPosition() {
    // geeting co-ordinates
    if (navigator.geolocation) {
      // console.log(this);
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
    }
  }

  _loadMap(position) {
    // console.log(this);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#zoomlevel);
    // console.log(map);

    // L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    // }).addTo(this.#map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    // ////////////////////////////
    this.#workouts.forEach(work => {
      this._renderWorkoutMap(work);
    });
  }

  _showForm(mapE) {
    // console.log(mapE);
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // empty fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    // hide form
    form.style.display = 'none';
    form.classList.add('hidden');

    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _validInput(...input) {
    return input.every(inp => Number.isFinite(inp));
  }
  _allPositive(...input) {
    return input.every(inp => inp > 0);
  }

  _newWorkout(e) {
    e.preventDefault();

    const currentWorkout = this.#workouts.find(ele => {
      return ele.id === this.#workoutElId;
    });
    console.log(currentWorkout);
    // new workout
    if (currentWorkout === undefined) {
      // Get data from form
      const type = inputType.value;
      const distance = +inputDistance.value; //converting string to int
      const duration = +inputDuration.value; //converting string to int
      const { lat, lng } = this.#mapEvent.latlng;
      let workout;

      // if workout running create running object
      if (type === 'running') {
        const cadence = +inputCadence.value;
        // Check if data is valid
        if (
          !this._validInput(distance, duration, cadence) ||
          !this._allPositive(distance, duration, cadence)
        ) {
          return alert('Inputs have to be positive numbers');
        }
        workout = new Running([lat, lng], distance, duration, cadence);
      }

      // if workout cycling create cycling object
      if (type === 'cycling') {
        const elevation = +inputElevation.value;
        if (
          !this._validInput(distance, duration, elevation) ||
          !this._allPositive(distance, duration)
        ) {
          return alert('Inputs have to be positive numbers');
        }
        workout = new Cycling([lat, lng], distance, duration, elevation);
      }
      // Add new object to workout array
      this.#workouts.push(workout);
      // console.log(this.#workouts);

      // Render workout on map as marker
      this._renderWorkoutMap(workout);

      // Render workout on list
      this._renderWorkout(workout);

      // Hide Form + clearing fields
      this._hideForm();

      // set local storage to all workouts
      this._setLocalStorage();
    } else {
      //editing workout
      this._editForm(currentWorkout);
    }
  }

  _renderWorkoutMap(workout) {
    const marker = L.marker(workout.coor)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
    this.#markers.push(marker);
    // console.log(this.#markers);
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">   
             
            <h2 class="workout__title">${workout.description}</h2>
            <div class="icons">  
                <span class="edit-icon">✏️</span>
                <span class="del-icon">❌</span>
            </div>        
            <div class="workout__details">
                <span class="workout__icon">${
                  workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                }</span>
                <span class="workout__value distance-${workout.id}">${
      workout.distance
    }</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value duration-${workout.id}">${
      workout.duration
    }</span>
                <span class="workout__unit">min</span>
            </div>
        `;

    if (workout.type === 'running') {
      html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value pace-${workout.id}">${workout.pace}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value cadence-${workout.id}">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li>
            `;
    }
    if (workout.type === 'cycling') {
      html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value speed-${workout.id}">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value elevation-gain-${workout.id}">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
            `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToView(e) {
    const workoutEl = e.target.closest('.workout');
    this.#workoutElId = e.target.closest('.workout').dataset.id;
    // console.log(e.target);
    // Guard clause
    if (!workoutEl) return;

    if (e.target.classList.contains('edit-icon')) {
      // edit button
      // showing edit form
      this._showForm();
      if (workoutEl.classList.contains('workout--cycling')) {
        document
          .getElementById('form-options')[1]
          .setAttribute('selected', 'selected');
        this._toggleElevationField();
      }
    } else if (e.target.classList.contains('del-icon')) {
      //del button
      this._delForm(workoutEl);
    } else {
      const workout = this.#workouts.find(ele => {
        return ele.id === this.#workoutElId;
      });

      this.#map.setView(workout.coor, this.#zoomlevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _editForm(currentWorkout) {
    // edit form selectors
    const DOMdistance = document.querySelector(
      `.distance-${this.#workoutElId}`
    );
    const DOMduration = document.querySelector(
      `.duration-${this.#workoutElId}`
    );

    // /////////////
    const type = inputType.value;
    if (type !== currentWorkout.type) {
      alert("workout type can't be changed");
    }
    const distance = +inputDistance.value; //converting string to int
    const duration = +inputDuration.value; //converting string to int

    if (type === 'running') {
      const DOMpace = document.querySelector(`.pace-${this.#workoutElId}`);
      const DOMcadence = document.querySelector(
        `.cadence-${this.#workoutElId}`
      );

      const cadence = +inputCadence.value;
      if (
        !this._validInput(distance, duration, cadence) ||
        !this._allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      // adding data to workout array
      currentWorkout.distance = distance;
      currentWorkout.duration = duration;
      currentWorkout.pace = (duration / distance).toFixed(1);
      currentWorkout.cadence = cadence;
      // changing DOM inner text
      DOMdistance.innerText = currentWorkout.distance;
      DOMduration.innerText = currentWorkout.duration;
      DOMpace.innerText = currentWorkout.pace;
      DOMcadence.innerText = currentWorkout.cadence;
    }
    if (type === 'cycling') {
      const DOMspeed = document.querySelector(`.speed-${this.#workoutElId}`);
      const DOMele = document.querySelector(
        `.elevation-gain-${this.#workoutElId}`
      );

      const elevation = +inputElevation.value;
      if (
        !this._validInput(distance, duration, elevation) ||
        !this._allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      // adding data to workout array
      currentWorkout.distance = distance;
      currentWorkout.duration = duration;
      currentWorkout.speed = (distance / (duration / 60)).toFixed(1);
      currentWorkout.elevationGain = elevation;
      // changing DOM inner text
      DOMdistance.innerText = currentWorkout.distance;
      DOMduration.innerText = currentWorkout.duration;
      DOMspeed.innerText = currentWorkout.speed;
      DOMele.innerText = currentWorkout.elevationGain;
    }
    // console.log(currentWorkout);
    // console.log(this.#workouts);

    // set local storage to all workouts
    this._setLocalStorage();
    // hide form + clear fields
    this._hideForm();

    document
      .getElementById('form-options')[1]
      .removeAttribute('selected', 'selected');
  }

  _delForm(workoutEl) {
    const workout = this.#workouts.find(ele => {
      return ele.id === this.#workoutElId;
    });

    // deleting data in workouts array and markers array
    const index = this.#workouts.indexOf(workout);

    // delete marker on map
    this.#map.removeLayer(this.#markers[index]);

    if (index > -1) {
      // only splice array when item is found
      this.#workouts.splice(index, 1);
      this.#markers.splice(index, 1);
    }

    // deleting data in local storage
    localStorage.removeItem('workouts');
    this._setLocalStorage();

    // deleting workout in UI list and Map
    workoutEl.remove();
  }

  _deleteAll() {
    const allworkoutele = document.querySelectorAll('.workout');
    allworkoutele.forEach(function (workout) {
      workout.remove();
    });
    this.#markers.forEach(function (marker) {
      this.#map.removeLayer(marker);
    }, this);
    this.#workouts = [];
    this.#markers = [];
    this._setLocalStorage();
  }
}

const app = new App();
