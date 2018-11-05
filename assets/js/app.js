/* global jQuery, firebase */

/**
 * Train Scheduler
 *
 * The Coding Boot Camp at UNC Charlotte.
 * (c) 2018 Richard Cyrus <richard.cyrus@rcyrus.com>
 */

(function ($) {
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
         * Display the current time on the 'Current Train Schedule'
         * panel.
         */
        const clock = function () {
            const date = new Date();

            const hour = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();

            /**
             * Determine if the provided number should have a leading
             * zero added to it.
             *
             * @param unit
             * @returns {string}
             */
            function padZero(unit) {
                return (unit < 10) ? `0${unit}` : unit;
            }

            let timeDisplay = `${padZero(hour)}:${padZero(minutes)}:${padZero(seconds)}`;

            $('.clock-display').text(timeDisplay);

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
        const formatMinutes = function (minutes) {
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

            // Get the difference in minutes between now, and the
            // first departure time.
            let differenceMinutes = now.diff(
                startingDeparture,
                'minutes'
            );

            // Get the modulus of the minutes difference and the scheduling
            // interval.
            let intervalRemainder = differenceMinutes % departureInterval;

            // The time to the next train is the interval, minus the
            // modulus of minutes difference from now and the interval.
            let minutesToNext = departureInterval - intervalRemainder;

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
                times.nextArrival.format('HH:mm A'));

            // Update the 'Minutes Away' display.
            $(scheduleSelectors.minutesAwaySelector).text(
                formatMinutes(times.minutesAway));

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
            };

            // Start the 'Minutes Away' timer.
            timer(minutes, countdown, () => {
                return updateTrainTimeCounters(train, scheduleSelectors);
            });
        };

        /**
         * Add a row to the 'Current Train Schedule' table.
         *
         * @param data
         */
        const addScheduledTrain = function (data) {
            // Create a random identifier for the table rows so that we
            // can accurately update the 'Minutes Away' timer and the
            // 'Next Train' time.
            const rowIdentifier = Math.random()
                .toString(36)
                .replace(/[^a-z]+/g, '')
                .substr(0, 5);

            const times = getTrainTimes(
                data.firstTrainTime,
                data.trainInterval
            );

            const trainScheduleSelectors = {
                minutesAwaySelector: `#${rowIdentifier} > .minutes-away`,
                nextTrainTimeSelector: `#${rowIdentifier} > .next-train-time`
            };

            const tableRow = `
                <tr id="${rowIdentifier}">
                    <td>${data.startingLocation}</td>
                    <td>${data.destination}</td>
                    <td class="text-right">${data.trainInterval}</td>
                    <td class="text-right pr-2 next-train-time">
                        ${times.nextArrival.format('HH:mm A')}
                    </td>
                    <td class="text-right pr-4 minutes-away">
                        ${formatMinutes(times.minutesAway)}
                    </td>
                    <td class="d-flex justify-content-around">
                        <button class="btn btn-danger remove" type="button" role="delete">
                            <span class="fas fa-trash-alt"></span>
                        </button>
                    </td>
                </tr>`;

            table.append(tableRow);

            // Start the 'Minutes Away' timer.
            updateTimes(trainScheduleSelectors, data, times.minutesAway);
        };

        /**
         * Register the click and other handlers for the application.
         */
        const registerHandlers = function () {
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
                if (! e.isDefaultPrevented()) {
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

                    // Update the Train Schedule table.
                    addScheduledTrain(train);

                    // Clear the form fields.
                    form[0].reset();

                    // Remove the validation trigger class.
                    form.removeClass('was-validated');

                    return false;
                }
            });

            /**
             * Handle the removal of a row from the Schedule table when
             * the user click on the Trash/Remove button.
             */
            $('.table').on('click', '.remove', function () {
                $(this).parents('tr').detach();
            });
        };

        /**
         * Initialize the application.
         */
        const init = function () {
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

            // Register click and submit events.
            registerHandlers();
        };

        /**
         * Expose the public API for this module.
         */
        return {
            start: init
        };
    })();

    TrainScheduler.start();
})(jQuery);
