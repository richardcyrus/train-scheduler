/* global jQuery, firebase, firebaseui, moment */

/**
 * Train Scheduler
 *
 * The Coding Boot Camp at UNC Charlotte.
 * (c) 2018 Richard Cyrus <richard.cyrus@rcyrus.com>
 */

(function ($, firebase, moment, firebaseui) {
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
         * @type {firebase.firestore.Firestore}
         */
        let db = null;

        /**
         * Reference to the Firebase database object.
         *
         * @type {firebase.firestore.CollectionReference}
         */
        let scheduleCollection = null;

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
        const tableBody = $('tbody');

        /**
         * The authentication token for the logged-in user.
         *
         * @type {null|string}
         */
        let userIdToken = null;

        /**
         * The element reference for the sign-out button.
         *
         * @type {*|jQuery|HTMLElement}
         */
        const signOutButton = $('#sign-out');

        /**
         * Configure the firebase authentication providers.
         */
        const configureLoginWidget = function () {
            const uiConfig = {
                'signInSuccessUrl': '/',
                'signInOptions': [
                    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                    firebase.auth.GithubAuthProvider.PROVIDER_ID,
                ],
                'tosUrl': 'terms.html',
                'privacyPolicyUrl': 'privacy.html'
            };

            const ui = new firebaseui.auth.AuthUI(firebase.auth());
            ui.start('#firebaseui-auth-container', uiConfig);
            ui.disableAutoSignIn();
        };

        /**
         * Handle the firebase login/logout
         */
        const configureLogin = function () {
            firebase.auth().onAuthStateChanged(function (user) {
                if (user) {
                    $('#logged-out').addClass('d-none');

                    const name = user.displayName;
                    const welcomeName = name ? name : user.email;

                    user.getIdToken().then(function (idToken) {
                        userIdToken = idToken;

                        if (welcomeName) {
                            $('#user').text(`Welcome, ${welcomeName}`);
                        }

                        $('#logged-in').removeClass('d-none');
                    });
                } else {
                    $('#logged-in').addClass('d-none');
                    $('#logged-out').removeClass('d-none');
                }
            });
        };

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
         * Process an error result from a firebase database request.
         *
         * @param {firebase.firestore.FirestoreError} error
         */
        const handleFirebaseError = function (error) {

            switch (error.code) {
                case 'cancelled':
                    showAlert('The operation was cancelled.');
                    break;
                case 'unknown':
                    showAlert('An unknown error occurred.');
                    break;
                case 'invalid-argument':
                    showAlert('An invalid argument was provided.');
                    break;
                case 'deadline-exceeded':
                    showAlert('The time to complete the operation has been exceeded.', 'warning');
                    break;
                case 'not-found':
                    showAlert('The requested record was not found.');
                    break;
                case 'already-exists':
                    showAlert('The record you are attempting to create already exists.');
                    break;
                case 'permission-denied':
                    showAlert('You do not have permission to complete your task.');
                    break;
                case 'resource-exhausted':
                    showAlert('Insufficient resources to process your request.');
                    break;
                case 'failed-precondition':
                    showAlert('The system is not ready to process your request.');
                    break;
                case 'aborted':
                    showAlert('The operation was aborted.');
                    break;
                case 'out-of-range':
                    showAlert('The request was outside the valid range.');
                    break;
                case 'unimplemented':
                    showAlert('The requested operation is not supported.');
                    break;
                case 'unavailable':
                    showAlert('The system is currently not available.');
                    break;
                case 'unauthenticated':
                    showAlert('You have not provided sufficient credentials to complete the operation.');
                    break;
            }
        };

        /**
         * Add a new record to the database.
         *
         * @param {Object|firebase.firestore.DocumentData} data
         */
        const saveNewTrain = function (data) {
            scheduleCollection.add(data)
                .then(function (docRef) {
                    addScheduledTrain(docRef.id, docRef.get().data());
                })
                .catch(function (error) {
                    handleFirebaseError(error);
                });
        };

        /**
         * Remove a schedule record from the database.
         *
         * @param {string} docPath
         */
        const removeTrainRecord = function (docPath) {
            scheduleCollection.doc(docPath).delete()
                .then(function () {
                    $(`[data-record-id="${docPath}"]`).detach();
                })
                .catch(function (error) {
                    handleFirebaseError(error);
                });
        };

        /**
         * Determine if the provided unit should have a leading
         * zero added to it.
         *
         * @param unit
         * @returns {string}
         */
        const padZero = function (unit) {
            return (unit < 10) ? `0${unit}` : unit;
        };

        /**
         * Display a clock on the page.
         */
        const clock = function () {
            const date = new Date();

            const hour = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();

            let timeDisplay = `${padZero(hour)}:${padZero(minutes)}:${padZero(seconds)}`;

            $('.clock-display').text(timeDisplay);

            setTimeout(clock, 1000);
        };

        /**
         * A count down timer.
         *
         * @param {number} seconds
         * @param {Object} update
         * @param runWhenFinished
         */
        const countDownTimer = function (seconds, update = false, runWhenFinished = false) {
            const now = Date.now();
            const then = now + seconds * 1000;

            const intervalId = setInterval(() => {
                const secondsLeft = Math.round((then - Date.now()) / 1000);

                if (secondsLeft <= 0) {
                    clearInterval(intervalId);

                    if (runWhenFinished) {
                        runWhenFinished();
                    }

                    return;
                }

                if (update) {
                    update.callback(secondsLeft, update.element);
                }
            }, 1000);
        };

        /**
         * Convert the TimeToTrain to hours:minutes:seconds.
         *
         * @param {number} seconds
         * @returns {string}
         */
        const convertTimeToTrain = function (seconds) {
            const time = new Date(0, 0, 0);
            time.setSeconds(seconds);

            const hours = time.getHours();
            const minutes = time.getMinutes();
            const secs = time.getSeconds();

            if (hours > 0) {
                return `${hours}:${padZero(minutes)}:${padZero(secs)}`;
            } else {
                return `${minutes}:${padZero(secs)}`;
            }
        };

        /**
         * Callback to update the display of the Time To Train in relation
         * to the time remaining to its arrival.
         *
         * @param {number} seconds
         * @param {jQuery|HTMLElement} element
         */
        const updateTimeToTrain = function (seconds, element) {
            $(element).text(convertTimeToTrain(seconds));
        };

        /**
         * Determine the time to the next train returning both the
         * next scheduled train time and the number of seconds to the
         * arrival.
         *
         * @param firstDeparture
         * @param departureInterval
         * @returns {{nextArrival: *, secondsToNext: number}}
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
                secondsToNext: (minutesToNext * 60)
            };
        };

        /**
         * Update the display of the 'Next Train' time and the 'Time To Train'
         * when the 'Time To Train' reaches zero.
         *
         * @param {Object} data
         * @param {Object} scheduleSelectors
         */
        const updateTrainTimeCounters = function (data, scheduleSelectors) {
            const times = getTrainTimes(
                data.firstTrainTime,
                data.trainInterval
            );

            $(scheduleSelectors.nextTrainTime).text(
                times.nextArrival.format('h:mm A'));

            $(scheduleSelectors.timeToTrain).text(
                convertTimeToTrain(times.secondsToNext));

            // Restart the count down timer on the Time To Train column.
            manageTrainTimes(scheduleSelectors, data, times.secondsToNext);
        };

        /**
         * Initiate the process for updating the Time To Train, and
         * managing the Next Train time.
         *
         * @param {Object} scheduleSelectors
         * @param {Object} train
         * @param {number} seconds
         */
        const manageTrainTimes = function (scheduleSelectors, train, seconds) {

            const updateObject = {
                callback: updateTimeToTrain,
                element: scheduleSelectors.timeToTrain
            };

            countDownTimer(seconds, updateObject, function () {
                return updateTrainTimeCounters(train, scheduleSelectors);
            });
        };

        /**
         * Update the 'Current Train Schedule' table.
         *
         * @param {firebase.firestore.DocumentReference|string} rowIdentifier
         * @param {Object} data
         */
        const addScheduledTrain = function (rowIdentifier, data) {
            /**
             * Define the selectors for updating the `Next Train` and
             * `Time to Train` cells.
             *
             * @type {{minutesAwaySelector: string, nextTrainTimeSelector: string}}
             */
            const trainScheduleSelectors = {
                timeToTrain: `[data-record-id="${rowIdentifier}"] > .time-to-train`,
                nextTrainTime: `[data-record-id="${rowIdentifier}"] > .next-train-time`
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
                    <td class="text-right pr-4 time-to-train">
                        ${convertTimeToTrain(times.secondsToNext)}
                    </td>
                    <td class="d-flex justify-content-around">
                        <button class="btn btn-danger remove" type="button" role="delete">
                            <span class="fas fa-trash-alt"></span>
                        </button>
                    </td>
                </tr>`;

            tableBody.append(tableRow);

            // Start the 'Time to train' timer.
            manageTrainTimes(trainScheduleSelectors, data, times.secondsToNext);
        };

        /**
         * Register the event handlers for the application.
         */
        const registerHandlers = function () {
            /**
             * Setup the listener for database modifications and adding
             * the rows to the schedule table.
             */
            scheduleCollection.onSnapshot(
                {
                    includeMetadataChanges: true
                },
                function (snapshot) {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            addScheduledTrain(change.doc.id, change.doc.data());
                        }
                        else if (change.type === 'removed') {
                            $(`[data-record-id="${change.doc.id}"]`).detach()
                        }
                    });
                },
                function (error) {
                    handleFirebaseError(error);
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
                 * The checkValidity() call has to occur on a form node.
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

                    saveNewTrain(train);

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
                const docPath = $(this).parents('tr').attr('data-record-id');

                removeTrainRecord(docPath);
            });

            /**
             * Handle the sign-out process.
             */
            signOutButton.on('click', function (e) {
                e.preventDefault();

                firebase.auth().signOut().then(function () {
                    // showAlert('Sign out successful', 'success');
                }).catch(function (error) {
                    handleFirebaseError(error);
                });
            });
        };

        /**
         * Initialize the application.
         */
        const init = function (config) {
            const app = firebase.initializeApp(config);

            db = firebase.firestore(app);

            db.settings({
                timestampsInSnapshots: true
            });

            // Set the Cloud Firestore collection root.
            scheduleCollection = db.collection('schedules');

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

            registerHandlers();
            configureLoginWidget();
            configureLogin();
            clock();
        };

        /**
         * Expose the public API for this module.
         */
        return {
            start: init
        };
    })();

    TrainScheduler.start(firebaseConfig);
})(jQuery, firebase, moment, firebaseui);
