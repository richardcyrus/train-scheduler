/* global jQuery, firebase */

/**
 * Train Scheduler
 *
 * The Coding Boot Camp at UNC Charlotte.
 * (c) 2018 Richard Cyrus <richard.cyrus@rcyrus.com>
 */

(function ($, firebase, moment) {
    "use strict";

    /**
     * The configuration information, needed to connect with Firebase.
     *
     * @type {{apiKey: string, authDomain: string, databaseURL: string, projectId: string, storageBucket: string, messagingSenderId: string}}
     */
    const firebaseConfig = {
        apiKey: "AIzaSyAubOqrSPuKuz3ftTDNQCpetHJu_dE7AMk",
        authDomain: "train-scheduler-bf006.firebaseapp.com",
        databaseURL: "https://train-scheduler-bf006.firebaseio.com",
        projectId: "train-scheduler-bf006",
        storageBucket: "train-scheduler-bf006.appspot.com",
        messagingSenderId: "910463259916"
    };

    const TrainScheduler = (function () {

        /**
         * Reference to the Firebase database object.
         *
         * @type {firebase.firestore.DocumentReference|firebase.firestore.CollectionReference}
         */
        let db = null;

        /**
         * The form on the page used to add new train records to the
         * schedule.
         *
         * @type {*|jQuery|HTMLElement}
         */
        const form = $('#add-train');

        /**
         * The body of the table where we will display the new schedule
         * records.
         *
         * @type {*|jQuery|HTMLElement}
         */
        const table = $('tbody');

        /**
         * Display a message on the screen to tell the user something.
         *
         * @param {string} message
         * @param {string} level
         */
        const showAlert = function (message, level = 'danger') {
            const levels = [
                'primary',
                'secondary',
                'success',
                'danger',
                'warning',
                'info',
                'light',
                'dark'
            ];

            if (!levels.includes(level)) {
                level = 'warning';
            }

            const closeSymbol = $('<span/>')
                .attr('aria-hidden', 'true')
                .html('&times;');

            const button = $('<button/>')
                .addClass('close')
                .attr({
                    'data-dismiss': 'alert',
                    'aria-label': 'Close'
                }).append(closeSymbol);

            const alert = $('<div/>')
                .addClass(`alert alert-${level} alert-dismissible fade show`)
                .attr('role', 'alert')
                .append(message, button);

            $('.alert-container').append(alert);
        };

        /**
         * Add a new record to the database.
         *
         * @param {Object} data
         * @type {{startingLocation: string, destination: string, firstTrainTime: string, trainInterval: number}} data
         */
        const saveNewTrain = function (data) {
            db.add(data).catch((error) => {
                showAlert(`Error adding document: ${error}`);
            });
        };

        /**
         * Remove a schedule record from the database.
         *
         * @param {string} docPath
         */
        const removeTrainRecord = function (docPath) {
            db.doc(docPath).delete().catch((error) => {
                showAlert(`Error removing document: ${error}`);
            });
        };

        /**
         * Display the a clock in the Jumbotron.
         */
        const clock = function () {
            $('.clock-display').text(moment().format('h:mm:ss A'));
            setTimeout(clock, 1000);
        };

        /**
         * Manage the countdown timer for the Minutes Away column in the
         * schedule.
         *
         * @param minutes
         * @param displayUpdate
         * @param runWhenFinished
         */
        const timer = function (minutes, displayUpdate = false, runWhenFinished = false) {
            const now = Date.now();
            const then = now + (minutes * 60) * 1000;

            const intervalId = setInterval(() => {
                let timeLeft = Math.round((then - Date.now()) / 1000);

                if (timeLeft <= 0) {
                    clearInterval(intervalId);

                    if (runWhenFinished) {
                        runWhenFinished();
                    }

                    return;
                }

                if (displayUpdate) {
                    displayUpdate(timeLeft);
                }
            }, 1000);
        };

        /**
         * Format the whole number of minutes into 00:00.
         *
         * @param minutes
         * @returns {string}
         */
        const formatTimeToTrain = function (minutes) {
            const seconds = Math.floor(minutes * 60);
            const remainder = seconds % 60;

            return `${minutes}:${remainder < 10 ? '0' : ''}${remainder}`;
        };

        /**
         * Determine the time to the next train returning both the
         * total minutes (next train) and the remaining interval
         * (minutes to next).
         *
         * @param firstDeparture
         * @param departureInterval
         * @returns {{nextArrival: *, minutesAway: number}}
         */
        const getTrainTimes = function (firstDeparture, departureInterval) {
            // Get the current date & time.
            let now = moment();

            // Convert the departure date, into a date 1 year ago.
            // This ensures for comparison purposes it's older than now().
            let startingDeparture = moment(
                firstDeparture,
                moment.HTML5_FMT.TIME
            ).subtract(1, 'years');

            let timeDifference = now.diff(
                startingDeparture,
                'minutes'
            );

            let timeApart = timeDifference % departureInterval;

            let minutesToNext = departureInterval - timeApart;

            // The next train will arrive in now + minutes to next.
            let nextTrain = now.add(
                minutesToNext,
                'minutes'
            );

            // Send the important parts to the caller.
            return {
                nextArrival: nextTrain,
                minutesAway: minutesToNext
            };
        };

        /**
         * When the 'Minutes Away' counter reaches 0, get and display
         * the new 'Next Train' time, and start the 'Minutes Away' counter
         * again.
         *
         * @param data
         * @param scheduleSelectors
         */
        const updateTrainTimeCounters = function (data, scheduleSelectors) {
            // Get the next times.
            const times = getTrainTimes(
                data.firstTrainTime,
                data.trainInterval
            );

            // Update with the next time for the train.
            $(scheduleSelectors.nextTrainTimeSelector).text(
                times.nextArrival.format('h:mm A'));

            // Update the 'Minutes Away' display.
            $(scheduleSelectors.minutesAwaySelector).text(
                formatTimeToTrain(times.minutesAway));

            // Start the 'Minutes Away' counter.
            updateTimes(scheduleSelectors, data, times.minutesAway);
        };

        /**
         * Start the initial 'Minutes Away' counter when a record is added,
         * and setup to update the 'Next Train' and 'Minutes Away' when
         * the initial timer expires.
         *
         * @param scheduleSelectors
         * @param train
         * @param minutes
         */
        const updateTimes = function (scheduleSelectors, train, minutes) {
            /**
             * Update the display of the 'Minutes Away' from the results
             * of the `timer` function.
             *
             * @param seconds
             */
            const countdown = function (seconds) {
                const minutes = Math.floor(seconds / 60);
                const remainder = seconds % 60;

                let time = `${minutes}:${remainder < 10 ? '0' : ''}${remainder}`;

                $(scheduleSelectors.minutesAwaySelector).text(time);
                // $(scheduleSelectors.minutesAwaySelector).text(
                //     moment().add(seconds, 'seconds').format('h:mm:ss')
                // );
            };

            // Start the 'Minutes Away' timer.
            timer(minutes, countdown, () => {
                return updateTrainTimeCounters(train, scheduleSelectors);
            });
        };

        /**
         * Add a row to the 'Current Train Schedule' table.
         *
         * @param {firebase.firestore.DocumentReference|string} rowIdentifier The document Path from Firebase.
         * @param {Object} data
         * @type {{startingLocation: string, destination: string, firstTrainTime: string, trainInterval: number}} data
         */
        const addScheduledTrain = function (rowIdentifier, data) {
            /**
             * Define the selectors for updating the `Next Train` and
             * `Time to Train` cells dynamically.
             *
             * @type {{minutesAwaySelector: string, nextTrainTimeSelector: string}}
             */
            const trainScheduleSelectors = {
                minutesAwaySelector: `[data-record-id="${rowIdentifier}"] > .minutes-away`,
                nextTrainTimeSelector: `[data-record-id="${rowIdentifier}"] > .next-train-time`
            };

            // Get the arrival times, and time to next train.
            const times = getTrainTimes(
                data.firstTrainTime,
                data.trainInterval
            );

            const tableRow = `
                <tr data-record-id="${rowIdentifier}">
                    <td>${data.startingLocation}</td>
                    <td>${data.destination}</td>
                    <td class="text-right">${data.trainInterval}</td>
                    <td class="text-right pr-2 next-train-time">
                        ${times.nextArrival.format('h:mm A')}
                    </td>
                    <td class="text-right pr-4 minutes-away">
                        ${formatTimeToTrain(times.minutesAway)}
                    </td>
                    <td class="d-flex justify-content-around">
                        <button class="btn btn-danger remove" type="button" role="delete">
                            <span class="fas fa-trash-alt"></span>
                        </button>
                    </td>
                </tr>`;

            table.append(tableRow);

            // Start the 'Time to train' timer.
            updateTimes(trainScheduleSelectors, data, times.minutesAway);
        };

        /**
         * Process the onSnapshot events from Firestore.
         *
         * In this case we use it to make the additions to the
         * train schedule table when the page is first loaded, and when
         * records are added to the database.
         *
         * @param {firebase.firestore.QuerySnapshot} snapshot
         */
        const handleDataChange = function (snapshot) {
            snapshot.docChanges().forEach((change) => {
                /**
                 * The onSnapshot event is triggered for all non-metadata
                 * changes. Here we only look for 'added' to ensure that
                 * we don't duplicate the rows displayed in the table.
                 *
                 * 'added' is fired on first connection, and for each
                 * save `.add()` to the database.
                 */
                if (change.type === 'added') {
                    addScheduledTrain(change.doc.id, change.doc.data());
                }
            });
        };

        /**
         * Register the event handlers for the application.
         */
        const registerHandlers = function () {
            /**
             * Setup the listener for database modifications and adding
             * the rows to the schedule table.
             */
            db.onSnapshot(
                handleDataChange,
                function (error) {
                    showAlert(`There was an error with the database: ${error}`);
                }
            );

            /**
             * Handle Form validation and submission of user provided
             * values.
             */
            form.on('submit', function (e) {
                /**
                 * Trigger client side form validation.
                 *
                 * The checkValidity() call has to occur on a form node
                 * not on the <form> element itself.
                 *
                 * $(this) = [form#add-train.needs-validation]
                 * $(this)[0] = the full form HTML with all fields.
                 */
                if ($(this)[0].checkValidity() === false) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                form.addClass('was-validated');

                // If the form is valid, process it.
                if (!e.isDefaultPrevented()) {
                    // Prevent the default action of the submit button.
                    e.preventDefault();

                    const train = {
                        startingLocation: null,
                        destination: null,
                        firstTrainTime: null,
                        trainInterval: 0
                    };

                    $.each($('input'), function () {
                        if ($(this).is('input[name="train_name"]')) {
                            train.startingLocation = $(this).val();
                        } else if ($(this).is('input[name="train_destination"]')) {
                            train.destination = $(this).val();
                        } else if ($(this).is('input[name="first_train"]')) {
                            train.firstTrainTime = $(this).val();
                        } else if ($(this).is('input[name="departure_interval"]')) {
                            train.trainInterval = parseInt($(this).val());
                        }
                    });

                    // Update the database.
                    saveNewTrain(train);

                    // Clear the form fields.
                    form[0].reset();

                    // Remove the validation status class.
                    form.removeClass('was-validated');

                    return false;
                }
            });

            /**
             * Handle the removal of a schedule when the user click on
             * the Trash/Remove button.
             */
            $('.table').on('click', '.remove', function () {
                // Get the record ID (The document path in Firestore.)
                const docPath = $(this).parents('tr')
                    .attr('data-record-id');

                removeTrainRecord(docPath);

                $(this).parents('tr').detach();
            });
        };

        /**
         * Initialize the application.
         */
        const init = function (config) {
            // Create the FireBase connection.
            firebase.initializeApp(config);

            // Initialize Cloud Firestore through Firebase.
            db = firebase.firestore();

            // Disable deprecated features.
            db.settings({
                timestampsInSnapshots: true
            });

            // Set the Cloud Firestore collection root.
            db = db.collection('schedules');

            // Show the clock on the page.
            clock();

            /**
             * Configure the jQuery TimePicker extension to provide a
             * uniform interface for defining the time for the first
             * train across all browsers.
             */
            $('.timepicker').timepicker({
                defaultTime: 'now',
                dropdown: true,
                dynamic: true,
                interval: 15,
                timeFormat: 'HH:mm'
            });

            // Register click and submit events, and the database
            // listener.
            registerHandlers();
        };

        /**
         * Expose the public API for this module.
         */
        return {
            start: init
        };
    })();

    TrainScheduler.start(firebaseConfig);
})(jQuery, firebase, moment);
