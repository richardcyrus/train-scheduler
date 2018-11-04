'use strict';

const {src, dest, series, watch} = require('gulp');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');

sass.compiler = require('node-sass');

const jsSrc = 'assets/js/*.js';
const scssSrc = 'assets/scss/*.scss';
const cssDest = 'assets/css/';

function compileCss() {
    return src(scssSrc)
        .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
        .pipe(dest(cssDest))
        .pipe(browserSync.stream())
}

function server() {
    browserSync.init({
        // browser: ["google chrome", "opera", "firefox"],
        browser: "google chrome",
        // browser: ["safari", "google chrome"],
        injectChanges: true,
        notify: false,
        open: true,
        reloadDebounce: 2000,
        server: {baseDir: "./"}
    });

    watch(scssSrc, compileCss);
    browserSync.watch(jsSrc).on('change', browserSync.reload);
    browserSync.watch("*.html").on('change', browserSync.reload);
}

exports.default = series(server);
