(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["report"] = factory();
	else
		root["report"] = factory();
})(global, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/DetailsView/bundled-details-view-styles.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.styleSheet = void 0;
    // Copyright (c) Microsoft Corporation. All rights reserved.
    // Licensed under the MIT License.
    exports.styleSheet = `.no-failure-view--t7B10{font-size:15px;font-weight:normal;padding:15px 0px 15px 15px}\
\
button.insights-command-button--3Nv2E .command-bar-button-icon--1Ydw2{line-height:16px}button.insights-command-button--3Nv2E:disabled{color:var(--disabled-text)}button.insights-command-button--3Nv2E:disabled .command-bar-button-icon--1Ydw2{color:var(--disabled-text)}button.insights-command-button--3Nv2E:active .command-bar-button-icon--1Ydw2{color:var(--primary-text)}\
\
.action-and-cancel-buttons-component--GI-yD{display:flex;justify-content:flex-end}.action-and-cancel-buttons-component--GI-yD .action-cancel-button-col--2EdOO+.action-cancel-button-col--2EdOO{margin-left:8px}\
\
.failure-instance-panel--thsfi .observed-failure-textfield--ONahn{padding-bottom:12px}.failure-instance-panel--thsfi .header-text{font-size:21px}.failure-instance-snippet-empty-body--2ca2-{margin:8px 0px 24px 0px;color:var(--secondary-text)}.failure-instance-snippet-title--1Q6I5{margin:24px 0px 8px 0px;color:var(--primary-text)}.learn-more--3iKBL{color:var(--communication-primary);text-decoration:none;display:inline-block;margin-bottom:24px}.failure-instance-selector-note--15MmG{color:var(--secondary-text);margin:8px 0px 8px 0px}.failure-instance-snippet-filled-body--3zwCk{margin:8px 0px 24px 0px;padding:12px 16px 12px 16px;max-height:200px;color:var(--primary-text);background-color:var(--neutral-4);overflow-y:scroll;word-wrap:break-word}.failure-instance-snippet-error--2UH91{margin:9px 0px 50px 9px;color:var(--secondary-text);display:flex;flex-direction:row}.failure-instance-snippet-error-icon--1Hafi{color:var(--negative-outcome);padding:3px 8px}.edit-button--uX5yd{font-size:16px !important;line-height:24px !important;color:var(--neutral-100) !important}@media screen and (-ms-high-contrast: active){.edit-button--uX5yd{color:inherit !important}}\
\
.generic-panel--31WYg{color:var(--neutral-100)}.header-text--EEqsJ{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:600;font-size:21px;line-height:32px;letter-spacing:-0.02em;color:var(--neutral-100);margin-bottom:20px}\
\
.radio-button-group--318lK{float:left;line-height:24px}.radio-button-group--318lK .radio-label--2FT5t{font-size:14px;padding:0 0 0 26px;display:inline-block}.radio-button-group--318lK .ms-ChoiceField{float:left;margin-top:0px !important}@media screen and (-ms-high-contrast: active){.radio-button-group--318lK .ms-ChoiceField-wrapper.is-inFocus .ms-ChoiceField-field{outline:3px highlighttext solid !important}}.radio-button-group--318lK .ms-ChoiceField:nth-of-type(1){margin-right:8px}.radio-button-group--318lK .ms-ChoiceField-input{position:absolute}.radio-button-group--318lK .PASS .ms-ChoiceField:nth-of-type(1) .ms-ChoiceField-field::before,.radio-button-group--318lK .PASS .ms-ChoiceField:nth-of-type(1) .ms-ChoiceField-field::after{border-color:var(--positive-outcome)}.radio-button-group--318lK .FAIL .ms-ChoiceField:nth-of-type(2) .ms-ChoiceField-field::before,.radio-button-group--318lK .FAIL .ms-ChoiceField:nth-of-type(2) .ms-ChoiceField-field::after{border-color:var(--negative-outcome)}.undo-button--2tSGK{margin-left:8px !important}.undo-button--2tSGK .undo-button-icon--1qH7R{font-size:16px;line-height:24px;color:var(--neutral-100)}@media screen and (-ms-high-contrast: active){.undo-button--2tSGK .undo-button-icon--1qH7R{color:highlighttext !important}}@media screen and (-ms-high-contrast: active){.undo-button--2tSGK:focus,.undo-button-icon--1qH7R:focus{outline:1px highlighttext solid !important}}\
\
span.collapsible-title--3ZSug{padding-left:0.5vw}.collapsible--3LzYX{padding:0;cursor:pointer;width:100%;border:none;outline:none;line-height:0.25px;background-color:var(--neutral-0);display:flex;justify-content:flex-start;align-items:center}.collapsible--3LzYX h2{font-weight:300;font-size:17px}.collapsible-content--2GD_H{overflow:hidden;padding-left:calc(0.5vw + 13px)}\
\
.requirement-instructions-header--uMyry{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-style:normal;font-weight:600;font-size:16px;line-height:20px}.requirement-instructions--2I_lD{font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'}.requirement-instructions--2I_lD p,.requirement-instructions--2I_lD ol,.requirement-instructions--2I_lD li{margin:5px 0px}.requirement-instructions--2I_lD ol{-webkit-padding-start:16px}.requirement-instructions--2I_lD ol ol{list-style-type:lower-alpha}.requirement-instructions--2I_lD ol ol ol{list-style-type:lower-roman}\
\
.requirement-view-title--3HUUQ{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:600;font-size:21px;line-height:32px;letter-spacing:-0.02em;color:var(--primary-text);display:flex;align-items:center}\
\
.requirement-view--3NEyT{margin:0px 18px;padding-left:6px;padding-top:1vh;display:flex;flex-direction:column;height:100%;justify-content:space-between}.requirement-view--3NEyT .next-requirement-button--1Egfg{align-self:flex-end;margin-bottom:1vh;margin-top:1vh}.requirement-view--3NEyT .main-content--3NOqW{margin-top:10px}.requirement-view--3NEyT .main-content--3NOqW h3{font-weight:600;font-size:17px}.visual-helper{display:flex;padding-top:1.5vh;flex-wrap:wrap}.visual-helper-text{padding-right:0.9vh;font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-size:14px;line-height:20px}.no-matching-elements{font-weight:bold}\
\
.getting-started-view--3I0G9{margin:0px 18px;padding-left:6px;padding-top:1vh;padding-bottom:1vh;display:flex;flex-direction:column;height:100%;justify-content:space-between}.getting-started-header--26xD7{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:600;font-size:21px;line-height:32px;letter-spacing:-0.02em;padding-top:8px}.getting-started-header--26xD7 i{font-size:16px}.getting-started-header-title--3r-rT{margin-right:8px}.getting-started-title--3XmTu{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:600;font-size:17px;line-height:24px}.next-requirement-button--3tQMG{align-self:flex-end}\
\
div.insights-dialog-main-override--12zq8{width:75%;max-width:500px;user-select:text}@media screen and (max-width: 500px){div.insights-dialog-main-override--12zq8{min-width:240px;width:75%}}div.insights-dialog-main-override--12zq8 .dialog-body--2gMoa{font-size:16px}\
\
.target-change-dialog-modal--3zgrh .ms-Overlay{background-color:var(--neutral-alpha-60)}.target-change-dialog--3HntG{border-radius:6px;box-shadow:0 0 10px 0 var(--neutral-alpha-60)}.target-change-dialog--3HntG .ms-Dialog-title{font-weight:600}.target-change-dialog--3HntG .target-change-dialog-button-container--1xItb{display:flex;flex-wrap:wrap;justify-content:flex-end}.target-change-dialog--3HntG .target-change-dialog-button-container--1xItb .action-cancel-button-col--ws63Q{text-align:right;padding-left:0px;margin-top:4px}.target-change-dialog--3HntG .target-change-dialog-button-container--1xItb .action-cancel-button-col--ws63Q+.action-cancel-button-col--ws63Q{margin-left:8px}.target-change-dialog--3HntG .target-change-dialog-button-container--1xItb button{padding:0;height:32px}.target-change-dialog--3HntG .target-change-dialog-button-container--1xItb .continue-button--3Tzqa button{width:140px}.target-change-dialog--3HntG .target-change-dialog-button-container--1xItb .restart-button--3WpLv button{width:85px}\
\
.assessment-instance-label--1d3bv{width:24px;font-size:14px;height:24px;text-align:center;float:left;margin-right:8px;line-height:24px;color:var(--white)}.assessment-instance-label--1d3bv.radio{width:14px;height:14px;border-radius:50%;margin-top:6px}.assessment-instance-label--1d3bv.not-applicable{font-size:10px}.all-content--2KDJN{display:flex;flex-direction:row;vertical-align:center;font-size:14px;line-height:24px}.instance-header--13hY4{color:var(--primary-text);white-space:pre}@media screen and (-ms-high-contrast: active){.instance-header--13hY4{color:inherit}}.assessment-instance-textContent---vlfB{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:var(--secondary-text)}@media screen and (-ms-high-contrast: active){.assessment-instance-textContent---vlfB{color:inherit}}\
\
.expand-collapse-all-button--3fwBF{display:flex;padding:unset;padding-right:27px;margin-left:-2px;margin-top:2px}\
\
.visual-helper-toggle--3wwwl{display:flex;align-items:center;word-wrap:break-word;margin:unset}.visual-helper-toggle--3wwwl label{font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:normal;font-size:14px;line-height:20px;margin-right:8px}\
\
.cards-visualization-modifiers-container--3fMsJ{display:flex}\
\
.is-selected .left-nav-link-container--3jKAJ{color:var(--light-black)}.left-nav-link-container--3jKAJ{padding-left:5%;padding-right:8%;width:200px;color:var(--primary-text);display:flex;flex-wrap:nowrap;justify-content:flex-start;height:100%;align-items:center}.left-nav-link-container--3jKAJ .link-icon--3gS-L{font-size:24px}\
\
.getting-started--2VFnm{padding-left:5%;color:var(--primary-text)}.is-selected .getting-started--2VFnm{color:var(--light-black)}\
\
.requirement-status-icon--1rToN{font-size:20px}\
\
.header-bar--2V9tw{display:flex;flex-wrap:nowrap;justify-content:flex-start;align-items:center;align-content:stretch;background-color:var(--ada-brand-color);min-height:40px;width:100%}.header-bar--2V9tw .header-icon{margin-left:16px;height:22px;width:22px;flex-shrink:0}.header-bar--2V9tw .header-title--1PT2K{margin-right:32px;margin-left:8px;color:var(--header-bar-title-color);font-size:16px;font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.header-bar--2V9tw .spacer--34lDq{flex:1 1 auto}.header-bar--2V9tw .far-items--2Nlyu{display:flex;justify-content:flex-end;align-items:center;margin-right:12px}.header-bar--2V9tw .far-items--2Nlyu button,.header-bar--2V9tw .far-items--2Nlyu button:focus,.header-bar--2V9tw .far-items--2Nlyu button:hover,.header-bar--2V9tw .far-items--2Nlyu button:active,.header-bar--2V9tw .far-items--2Nlyu button:hover:active{background-color:unset}.header-bar--2V9tw .far-items--2Nlyu i{font-size:20px;color:var(--neutral-0)}\
\
.no-content-available--3Sp2l{margin-left:24px;margin-right:24px}\
\
.assessment-report-summary--3LEXh{margin-bottom:40px;display:flex;flex-direction:column;width:100%}.assessment-report-summary--3LEXh>h2{font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-size:21px;margin:0px;line-height:32px;font-weight:600;letter-spacing:-0.02em;color:var(--primary-text);margin:0px}.assessment-report-summary--3LEXh .test-details-text--1nIGd{font-weight:600;font-size:17px;line-height:24px;color:var(--primary-text);font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';margin:16px 0px 21px 0px}\
\
.assessment-summary-details--3WXP3{display:flex}.assessment-summary-details--3WXP3 .assessment-summary-details-body--2MD3r{column-count:2;column-gap:4%;display:block;width:100%;align-items:start}@media screen and (max-width: 900px){.assessment-summary-details--3WXP3 .assessment-summary-details-body--2MD3r{column-count:1}}.assessment-summary-details--3WXP3 .assessment-summary-details-body--2MD3r .assessment-summary-details-row--2_3si{display:inline-block;width:100%}.assessment-summary-details--3WXP3 .assessment-summary-details-body--2MD3r .assessment-summary-details-row--2_3si .test-summary--2cP_y{display:flex;width:98%;padding:12px 10px;justify-content:space-between;border-bottom:var(--neutral-alpha-8) solid 1px}.assessment-summary-details--3WXP3 .assessment-summary-details-body--2MD3r .assessment-summary-details-row--2_3si .test-summary-status--wlYPx{display:flex;align-items:center;white-space:nowrap}.assessment-summary-details--3WXP3 .assessment-summary-details-body--2MD3r .assessment-summary-details-row--2_3si .test-summary-display-name--3Wtgb{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-size:14px;line-height:20px;white-space:nowrap;font-weight:600}\
\
.report-header-bar--3yeP8{display:flex;justify-content:flex-start;align-items:center;flex-wrap:nowrap;background-color:var(--ada-brand-color);height:40px;width:100%}.report-header-bar--3yeP8 .header-icon{flex-shrink:0;margin-left:16px;height:22px;width:22px}.report-header-bar--3yeP8 .header-text--2Ht6R{margin-left:8px;color:var(--header-bar-title-color);flex-shrink:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:normal;font-size:17px;line-height:24px}.report-header-command-bar--CWe48{height:40px;width:100%;display:flex;justify-content:end;min-height:fit-content;align-items:center;background-color:var(--neutral-0);box-shadow:0px 1px 0px rgba(0,0,0,0.08)}.report-header-command-bar--CWe48 .target-page--16UqC{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0px 0px 0px 16px;display:inherit;color:var(--primary-text);font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-size:14px;line-height:20px;font-weight:normal}.report-header-command-bar--CWe48 .target-page--16UqC a{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
\
.report-congrats-message--1O-Tl{word-break:break-word;overflow-wrap:break-word}.report-congrats-head--6pvch{font-size:16px;font-weight:600;color:var(--primary-text);padding:10px 0 10px 0}.report-congrats-info--pvbRt{font-size:14px;color:var(--secondary-text);padding:10px 0 10px 0}.sleeping-ada--3M6Q7{height:100px}\
\
.outcome-chip-container--3NUUD{min-width:50px}\
\
.instance-details-card--OrpLo{border-radius:4px;border:1px solid var(--card-border);outline-style:'border-style';box-shadow:0px 0.6px 1.8px var(--box-shadow-108),0px 3.2px 7.2px var(--box-shadow-132);margin-bottom:16px;cursor:pointer;width:-moz-available;width:-webkit-fill-available;width:fill-available}.instance-details-card-container--_ELdq.selected--3O8dW{outline:5px solid var(--communication-tint-10)}.instance-details-card--OrpLo.selected--3O8dW{border:1px solid transparent}.instance-details-card--OrpLo:focus{outline:2px solid var(--primary-text);outline-offset:2px}.instance-details-card--OrpLo.selected--3O8dW:focus{outline-offset:8px}.instance-details-card--OrpLo:hover{box-shadow:0px 8px 10px var(--box-shadow-108),0px 8px 10px var(--box-shadow-132)}.report-instance-table--ljlFi{background:var(--neutral-0);display:table;table-layout:fixed;width:-moz-available;width:-webkit-fill-available;width:fill-available;border-radius:inherit}.report-instance-table--ljlFi th{padding:12px 20px;vertical-align:top}.report-instance-table--ljlFi .row--kaG63{top:calc(50% - 20px / 2);border-bottom:0.5px solid var(--neutral-10)}.report-instance-table--ljlFi .row--kaG63:last-child{border-bottom:none}.report-instance-table--ljlFi .label--2oToo{font-size:14px;line-height:20px;font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';color:var(--primary-text);text-align:left;width:70px}.report-instance-table--ljlFi .instance-list-row-content--2vx_t{color:var(--secondary-text);padding:12px 20px;font-size:14px;line-height:20px;align-items:flex-end;display:flex}.report-instance-table--ljlFi .instance-list-row-content--2vx_t.content-snipppet--3_Pd3{font-family:Consolas, Segoe UI, Courier New, monospace;white-space:normal;word-wrap:break-word;word-break:break-word}table.report-instance-table--ljlFi{border-collapse:collapse;overflow-x:auto;word-break:break-word}@media screen and (max-width: 480px){.report-instance-table--ljlFi tr{display:block}.report-instance-table--ljlFi td{display:block}.report-instance-table--ljlFi td .label--2oToo{text-align:left}.report-instance-table--ljlFi td .instance-list-row-content--2vx_t{text-align:right}.report-instance-table--ljlFi td::before{float:left}.report-instance-table--ljlFi .label--2oToo{padding:14px 20px 6px 20px}.report-instance-table--ljlFi .instance-list-row-content--2vx_t{padding:6px 20px 14px 20px}}\
\
.multi-line-text-no-bullet--3igrU{padding-left:0;list-style:none}.multi-line-text-no-bullet--3igrU li:not(:last-child){margin-bottom:4px}.multi-line-text-yes-bullet--ebJpE{padding-left:16px}.multi-line-text-yes-bullet--ebJpE li{list-style-type:disc;margin-bottom:4px}.combination-lists--2hRoK{flex-direction:column;display:flex}\
\
.insights-fix-instruction-list--1vUZj li span.fix-instruction-color-box--2DKsr{width:14px;height:14px;display:inline-block;vertical-align:-5%;margin:0px 2px;border:1px solid var(--light-black)}.insights-fix-instruction-list--1vUZj .screen-reader-only--QfHg0{position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden}\
\
.toast-container--YaZxW{display:inline-block}.toast-content--Wt0Lj{background:var(--neutral-70);border-radius:4px;color:var(--neutral-0);padding-left:20px;padding-top:14px;padding-bottom:14px;padding-right:20px;width:316px;margin-left:calc(316px / -2 - 20px);left:50%;bottom:20px;z-index:1000;position:absolute}\
\
.how-to-fix-content--2-Pc1{margin-bottom:16px}.how-to-fix-content--2-Pc1 ul{padding-left:16px}.how-to-fix-content--2-Pc1 ul li{list-style-type:disc;margin-bottom:4px}\
\
div.kebab-menu-callout--14fgT{box-shadow:0px 6.4px 14.4px var(--box-shadow-132),0px 1.2px 3.6px var(--box-shadow-108);border-radius:4px;border-width:0px}div.kebab-menu-callout--14fgT>div{border-radius:4px}.kebab-menu--z2Gzc{background:var(--neutral-3);border:1px solid var(--menu-border)}.kebab-menu--z2Gzc li{background-color:var(--neutral-3)}.kebab-menu--z2Gzc button i{color:var(--primary-text)}.kebab-menu--z2Gzc button:hover{background-color:var(--menu-item-background-hover)}.kebab-menu--z2Gzc button:active{background-color:var(--menu-item-background-active);color:var(--light-black)}.kebab-menu--z2Gzc button:active i{color:var(--light-black)}button.kebab-menu-button--2aa2O{width:34px;height:32px;margin:8px;border-radius:2px;background:transparent}button.kebab-menu-button--2aa2O svg{stroke:var(--primary-text)}@media screen and (-ms-high-contrast: active){button.kebab-menu-button--2aa2O svg{fill:inherit !important}}button.kebab-menu-button--2aa2O:hover{background-color:var(--menu-item-background-hover)}button.kebab-menu-button--2aa2O:active,button.kebab-menu-button--2aa2O[aria-expanded='true']{background-color:var(--menu-item-background-active);color:var(--light-black)}button.kebab-menu-button--2aa2O:active svg>circle,button.kebab-menu-button--2aa2O[aria-expanded='true'] svg>circle{stroke:var(--light-black)}button.kebab-menu-button--2aa2O>span{justify-content:center}\
\
.foot--1bb1r{display:flex;justify-content:space-between;align-items:center;background-color:var(--neutral-2);height:48px;padding-left:12px;border-top:0.5px solid var(--card-footer-border);border-bottom-left-radius:inherit;border-bottom-right-radius:inherit}.foot--1bb1r .highlight-status--1IQGd{display:flex;justify-content:space-between;align-items:center;background:transparent}.foot--1bb1r .highlight-status--1IQGd svg{fill:var(--secondary-text)}.foot--1bb1r .highlight-status--1IQGd label{color:var(--secondary-text);font-size:14px}\
\
ul.instance-details-list--2Beza{list-style-type:none;padding-inline-start:unset;margin-block-start:unset;margin-block-end:unset}ul.instance-details-list--2Beza>li{margin-bottom:16px}ul.instance-details-list--2Beza>li:last-child{margin-bottom:unset}\
\
.rule-more-resources--3PCDe{display:flex;flex-direction:column;margin-bottom:16px;padding:14px 20px;background-color:var(--neutral-0);box-shadow:0px 0.3px 0.9px rgba(0,0,0,0.108),0px 1.6px 3.6px rgba(0,0,0,0.132);border-radius:4px;border:1px solid var(--card-border);line-height:20px}.rule-more-resources--3PCDe .more-resources-title--17xOw{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'}.rule-more-resources--3PCDe .rule-details-id--ie-v-{padding:12px 0}\
\
.rule-details-group--39A1d .rule-detail{font-size:14px;padding:16px 8px;display:flex;align-items:baseline;text-align:left}.rule-details-group--39A1d .rule-detail .outcome-chip{vertical-align:middle;margin-bottom:2px}.rule-details-group--39A1d .rule-detail .rule-details-id{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';color:var(--primary-text);word-break:break-all}.rule-details-group--39A1d .rule-detail .rule-details-id a{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';color:var(--primary-text) !important}.rule-details-group--39A1d .rule-detail .rule-detail-description{color:var(--secondary-text) !important;word-break:break-all}.rule-details-group--39A1d .rule-detail .guidance-links a{color:var(--secondary-text) !important}.collapsible-rule-details-group--3aN3u{box-shadow:0px 1px 0px rgba(0,0,0,0.08)}.collapsible-rule-details-group--3aN3u .rule-detail{box-shadow:unset}.collapsible-rule-details-group--3aN3u:not(.collapsed){box-shadow:unset}\
\
.result-section-title--27ZOL{display:flex;flex-wrap:nowrap;justify-content:flex-start;align-items:center;margin-top:8px;margin-bottom:8px}.result-section-title--27ZOL .outcome-chip.outcome-chip-fail .count{line-height:11px}.result-section-title--27ZOL .outcome-chip.outcome-chip-fail svg{margin-bottom:3px}.result-section-title--27ZOL .title--nA1u1{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:600;font-size:17px;line-height:24px;margin-right:6px;color:var(--primary-text)}.result-section-title--27ZOL .outcome-chip-container--1Vd7P{display:flex;height:16px}\
\
.result-section--1FLO5{padding-bottom:58px}.result-section--1FLO5 .title-container--1CFvU[aria-level='2'] .collapsible-control--ey-Vd::before{position:relative;bottom:2px}.result-section--1FLO5>h2{margin:0px;font-size:17px;line-height:24px}\
\
.collapsible-container--3MzoD .collapsible-control--1bULh[aria-expanded='false']:before,.collapsible-container--3MzoD .collapsible-control--1bULh[aria-expanded='true']:before{display:inline-block;border-right:1px solid var(--secondary-text);border-bottom:1px solid var(--secondary-text);min-width:7px;width:7px;height:7px;content:'';transform-origin:50% 50%;transition:transform 0.1s linear 0s}.collapsible-container--3MzoD .collapsible-control--1bULh{font-family:'Segoe UI Web (West European)', 'Segoe UI', '-apple-system', BlinkMacSystemFont, Roboto, 'Helvetica Neue', Helvetica, Ubuntu, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';background-color:transparent;cursor:pointer;border:none;display:flex;align-items:baseline;width:100%;height:fit-content}.collapsible-container--3MzoD .collapsible-control--1bULh:hover{background-color:var(--neutral-alpha-4);color:var(--primary-text)}.collapsible-container--3MzoD .collapsible-control--1bULh[aria-expanded='false']:before{-webkit-transform:rotate(-45deg);-ms-transform:rotate(-45deg);transform:rotate(-45deg)}.collapsible-container--3MzoD .collapsible-control--1bULh[aria-expanded='true']:before{-webkit-transform:rotate(45deg);-ms-transform:rotate(45deg);transform:rotate(45deg)}.collapsible-container--3MzoD .collapsible-container-content--tMojJ{margin-left:24px}.collapsible-container--3MzoD .collapsible-container-content--tMojJ[aria-hidden='true']{display:none}.collapsible-title--3mKsv{padding-left:0.5vw}\
\
span.fix-instruction-color-box--HXJ1A{width:14px;height:14px;display:inline-block;vertical-align:-5%;margin:0px 2px;border:1px solid var(--light-black)}.screen-reader-only--1uWLQ{position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden}\
\
.static-content-in-details-view--jGQY3{margin-top:24px;margin-right:24px;margin-left:24px;margin-bottom:auto}.static-content-in-details-view--jGQY3 ol{-webkit-padding-start:16px}.static-content-in-details-view--jGQY3 ol li ul li{list-style-type:disc}.static-content-in-details-view--jGQY3 i{font-size:16px}.details-view-toggle--3kiWK{margin-bottom:0;margin-top:12px;height:40px;background-color:var(--neutral-4)}.details-view-toggle--3kiWK .ms-Toggle-label{float:left;margin:5px 8px 5px 8px;color:var(--neutral-100)}.details-view-toggle--3kiWK .ms-Toggle-innerContainer{margin:10px 0px 10px 0px}\
\
.target-page-changed-subtitle--1OlJG{color:var(--secondary-text);max-width:570px;font-size:14px;margin-top:4px;margin-bottom:16px}\
\
.scanning-spinner--1OPL0{margin-top:50px}\
\
.details-disabled-message--3BBxF{margin-top:5px;margin-bottom:5px;font-size:14px}.issues-table--1p6qu{background-color:var(--neutral-2);height:100%;width:calc(100% - 24px - 24px);display:flex;flex-direction:column;padding-top:24px;padding-right:24px;padding-left:24px}.issues-table--1p6qu .issues-table-subtitle--7dCd5{color:var(--secondary-text);max-width:570px;font-size:14px;margin-top:4px;margin-bottom:16px}.issues-table--1p6qu .issues-table-content--3-Kjz{height:100%;display:flex;flex-direction:column;min-height:0}\
\
.generic-toggle-component--3Cd_F{margin-bottom:4vh}.generic-toggle-component--3Cd_F .toggle-container--2gta1{display:flex;justify-content:space-between;margin-bottom:1vh}.generic-toggle-component--3Cd_F .toggle-container--2gta1 .toggle-name--2wG9P{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:600;font-size:17px;line-height:24px}.generic-toggle-component--3Cd_F .toggle-container--2gta1 .toggle--3OTnY{margin-left:12px;margin-top:3px;margin-bottom:unset}.generic-toggle-component--3Cd_F .toggle-description--2FJe2{color:var(--secondary-text)}\
\
.overview-help-section--hdXEm{width:308px;height:168px;padding-top:24px;margin-right:32px}@media screen and (max-width: 1200px){.overview-help-section--hdXEm{padding-top:0px;margin-bottom:40px}}.overview--IJplw{display:flex;flex-direction:row;flex-wrap:wrap;padding-left:32px}.overview--IJplw .overview-text-summary-section--1MelK{display:flex;flex-direction:column;flex:1 1 50%;align-items:flex-start;width:90%;margin-right:32px}\
\
.overview-heading-content--3AXL8{color:var(--secondary-text);font-weight:normal;line-height:20px;font-size:15px}.overview-heading--1KfKD{margin-bottom:40px}.overview-heading--1KfKD h1{font-weight:bold !important;line-height:40px;font-size:28px !important;letter-spacing:-0.04em;color:var(--primary-text) !important;padding-bottom:16px;padding-top:24px}\
\
.help-link--1kfVC{padding:5px 0px 5px 0px;font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';line-height:20px;font-size:15px;color:var(--communication-primary)}\
\
.overview-help-container--3hChS{padding-top:20px;padding-left:24px;padding-bottom:24px;border-radius:4px;background-color:var(--help-links-section-background);border:1px solid var(--help-links-section-border);box-sizing:border-box}.help-heading--3FE31{font-weight:600;font-size:17px;padding:0px;margin-block-end:1em;margin-inline-start:0px;margin-inline-end:0px}\
\
.left-nav-hamburger-button--AgmoE{color:var(--neutral-0);margin-left:11px}.high-contrast-theme--WMLfQ .left-nav-hamburger-button--AgmoE{color:var(--neutral-alpha-90)}.ms-Button.left-nav-hamburger-button--AgmoE:focus::after{border:1px var(--neutral-0) solid}\
\
.details-view-command-buttons--1Cv-n{display:flex;margin-right:16px;white-space:nowrap}.details-view-command-bar--3CM-3{height:40px;width:100%;display:flex;justify-content:space-between;min-height:fit-content;align-items:center;background-color:var(--neutral-0);font-size:14px;font-weight:normal;border-bottom:1px solid var(--neutral-alpha-8)}.details-view-command-bar--3CM-3 .details-view-target-page--gTMTa{margin-left:12px;padding:8px 8px;display:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--primary-text);flex:1 1 auto}.target-page-title--2WDxK{width:100%;text-overflow:ellipsis;display:inline-block;overflow:hidden}.target-page-link--2VmFK{width:100%}\
\
.command-bar-buttons-menu-button--3CbaW{font-size:16px}.command-bar-buttons-submenu--l90ab{min-width:fit-content}.command-bar-buttons-submenu--l90ab button{height:36px}.command-bar-buttons-menu--3x-0l{height:40px}\
\
.export-dialog--2xeDr{max-width:640px;width:75%;min-width:240px !important;user-select:text}\
\
.start-over-menu-item--2aqCQ .start-over-menu-item-icon--2yRff{line-height:16px}.start-over-menu-item--2aqCQ button:disabled,.start-over-menu-item--2aqCQ button[aria-disabled='true']{color:var(--disabled-text)}.start-over-menu-item--2aqCQ button:disabled .start-over-menu-item-icon--2yRff,.start-over-menu-item--2aqCQ button[aria-disabled='true'] .start-over-menu-item-icon--2yRff{color:var(--disabled-text)}.start-over-menu-item--2aqCQ button:active .start-over-menu-item-icon--2yRff{color:var(--primary-text)}.start-over-menu-item--2aqCQ button:hover{background-color:var(--neutral-0);color:var(--insights-button-hover)}.start-over-menu-item--2aqCQ button:hover .start-over-menu-item-icon--2yRff{color:var(--insights-button-hover)}\
\
.details-view-test-nav-area--1ZcCU{box-sizing:border-box;overflow-x:hidden;max-height:calc( 100vh - detailsViewNavPivotsHeight - 40px - 40px)}.details-view-test-nav-area--1ZcCU a{padding-right:0px}@media screen and (-ms-high-contrast: active){.details-view-test-nav-area--1ZcCU a:focus{border:3px highlighttext solid}}\
\
a.nav-link-button--2EMMQ,button.nav-link-button--2EMMQ{width:calc(100% - 3px)}a.nav-link-button--2EMMQ:hover,a.nav-link-button--2EMMQ:active,a.nav-link-button--2EMMQ:focus,a.nav-link-button--2EMMQ:active:hover,button.nav-link-button--2EMMQ:hover,button.nav-link-button--2EMMQ:active,button.nav-link-button--2EMMQ:focus,button.nav-link-button--2EMMQ:active:hover{text-decoration:none}\
\
.no-preview-feature-message--1pkGs{font-family:'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:normal;font-size:14px;line-height:20px}\
\
.preview-feature-toggle-list--35SWx{margin-top:2vh}\
\
.selector-input-list--1Am85 .selector-input-title--3G3DG{margin-top:0.5vh;margin-bottom:0.5vh}.selector-input-list--1Am85 .selector-list--3-w8k{border:solid 1px var(--neutral-30);margin-top:1vh;margin-bottom:3vh;height:15%;overflow:auto}.selector-input-list--1Am85 .selector-list--3-w8k .ms-List-cell:last-child{border-bottom:solid var(--neutral-20) 1px}.selector-input-list--1Am85 .selector-list--3-w8k .ms-List-cell+.ms-List-cell{border-top:solid var(--neutral-20) 1px}.selector-input-list--1Am85 .selector-list--3-w8k .delete-selector-button--3xkiw{background:var(--neutral-0);padding-right:0px;margin:1px}.selector-input-list--1Am85 .selector-list--3-w8k .delete-selector-button--3xkiw .delete-selector-icon--2YF7A{color:var(--neutral-30)}.selector-input-list--1Am85 .selector-input-field--UoDJ5{width:55%}.selector-input-list--1Am85 .add-selector-buttons--1CPnk{width:40%}.selector-input-list--1Am85 .add-selector-buttons--1CPnk .textbox-add-selector-button--1Yfp3{width:80%}.selector-input-list--1Am85 .textbox-add-selector-button--1Yfp3{width:35%}.selector-input-item-cell--1ZRmI{padding-left:1vh}.selector-input-item-cell--1ZRmI .selector-input-item-content--2r4Q2{display:flex;justify-content:space-between;align-items:center}.selector-input-add--fo0qv{display:flex;justify-content:space-between;align-items:center}\
\
.scoping-description--MTUlF{padding-bottom:1vh}\
\
.settings-panel--KEOaQ h3{font-family:'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';font-weight:600;font-size:17px;line-height:24px;margin-block-end:8px}.settings-panel--KEOaQ .issue-setting--3jeNv .ms-Label{color:var(--neutral-100);padding-top:8px;padding-bottom:8px}.settings-panel--KEOaQ .issue-setting--3jeNv .ms-TextField-field{color:var(--neutral-100)}\
\
.ms-Button.gear-menu-button--3soQq:focus::after{border:1px var(--neutral-0) solid}.high-contrast-theme .gear-menu-button--3soQq{color:var(--neutral-alpha-90)}.high-contrast-theme .gear-menu-button-callout--zaXke{box-shadow:var(--white) 0px 0px 1px 0px !important;border-radius:unset}\
\
.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn{margin:8px}.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn .ms-Dropdown-title,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:focus .ms-Dropdown-title,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:hover .ms-Dropdown-title,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:active .ms-Dropdown-title,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:hover:active .ms-Dropdown-title{border:1px var(--neutral-alpha-90) solid;border-radius:2px;background-color:var(--neutral-0);height:32px;box-sizing:border-box;width:inherit;color:var(--neutral-alpha-90)}.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn .ms-Dropdown-title i,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:focus .ms-Dropdown-title i,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:hover .ms-Dropdown-title i,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:active .ms-Dropdown-title i,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:hover:active .ms-Dropdown-title i{margin-right:8px}.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn .ms-Dropdown-caretDownWrapper,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:focus .ms-Dropdown-caretDownWrapper,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:hover .ms-Dropdown-caretDownWrapper,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:active .ms-Dropdown-caretDownWrapper,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:hover:active .ms-Dropdown-caretDownWrapper{top:2px;right:18px}.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn .ms-Dropdown-caretDown,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:focus .ms-Dropdown-caretDown,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:hover .ms-Dropdown-caretDown,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:active .ms-Dropdown-caretDown,.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn:hover:active .ms-Dropdown-caretDown{color:var(--neutral-alpha-90)}.left-nav-switcher--3Z_Ly .left-nav-switcher-dropdown--3eSBn .ms-Dropdown:focus::after{border:1px var(--neutral-alpha-90) solid;border-radius:2px;outline:1px var(--neutral-alpha-90) solid;outline-offset:-5px}\
\
.header-switcher--1SXfB .header-switcher-dropdown--3OKpd .ms-Dropdown-title,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:focus .ms-Dropdown-title,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:hover .ms-Dropdown-title,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:active .ms-Dropdown-title,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:hover:active .ms-Dropdown-title{border:1px var(--neutral-0) solid;border-radius:2px;background-color:var(--ada-brand-color);height:32px;box-sizing:border-box;width:165px;color:var(--neutral-0)}.header-switcher--1SXfB .header-switcher-dropdown--3OKpd .ms-Dropdown-title i,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:focus .ms-Dropdown-title i,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:hover .ms-Dropdown-title i,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:active .ms-Dropdown-title i,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:hover:active .ms-Dropdown-title i{margin-right:8px}.header-switcher--1SXfB .header-switcher-dropdown--3OKpd .ms-Dropdown-caretDownWrapper,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:focus .ms-Dropdown-caretDownWrapper,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:hover .ms-Dropdown-caretDownWrapper,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:active .ms-Dropdown-caretDownWrapper,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:hover:active .ms-Dropdown-caretDownWrapper{top:2px;right:10px}.header-switcher--1SXfB .header-switcher-dropdown--3OKpd .ms-Dropdown-caretDown,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:focus .ms-Dropdown-caretDown,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:hover .ms-Dropdown-caretDown,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:active .ms-Dropdown-caretDown,.header-switcher--1SXfB .header-switcher-dropdown--3OKpd:hover:active .ms-Dropdown-caretDown{color:var(--neutral-0)}.header-switcher--1SXfB .header-switcher-dropdown--3OKpd .ms-Dropdown:focus::after{border:1px var(--neutral-0) solid;border-radius:2px;outline:1px var(--neutral-0) solid;outline-offset:-5px}@media screen and (-ms-high-contrast: active){.ms-Dropdown-items .ms-Button:focus{border:2px highlighttext solid !important}}.switcher-dropdown-option--2OP7K{display:flex;flex-direction:row}.switcher-dropdown-option--2OP7K i{margin-right:8px}\
\
.left-nav--1XcZJ li .is-selected{background-color:var(--nav-link-selected)}.left-nav--1XcZJ li .is-selected a,.left-nav--1XcZJ li .is-selected button{background-color:var(--nav-link-selected) !important}.left-nav--1XcZJ li .is-expanded,.left-nav--1XcZJ li .is-expanded+ul{background-color:var(--nav-link-expanded)}.left-nav--1XcZJ li .is-expanded .index-circle,.left-nav--1XcZJ li .is-expanded+ul .index-circle{color:var(--neutral-0);background:var(--index-circle-background);border-color:var(--neutral-0)}.left-nav--1XcZJ li>div:hover a,.left-nav--1XcZJ li>div:hover button{background-color:var(--nav-link-hover)}.left-nav--1XcZJ{overflow-y:auto;border-right:1px solid var(--neutral-8);z-index:100;background-color:var(--neutral-0);max-height:calc(100vh - (40px));height:calc(100vh - (40px))}.left-nav--1XcZJ .left-nav-icon{color:var(--neutral-60)}.left-nav--1XcZJ .ms-Nav-groupContent{margin-bottom:0px}.left-nav--1XcZJ .ms-Nav-link{height:fit-content}.left-nav--1XcZJ .overview-label{padding-left:10%;text-align:left;margin-top:6px;margin-bottom:6px;display:flex;flex-direction:column}.left-nav--1XcZJ .overview-name{line-height:20px}.left-nav--1XcZJ .overview-percent{color:var(--neutral-55);line-height:16px;font-size:12px}.left-nav--1XcZJ .index-circle{border:1px solid;display:inline-block;border-radius:50%;border:1px solid;width:1.5em;line-height:1.5em;padding:0.07em;margin-top:0.23em}.left-nav--1XcZJ .test-name{padding-left:10%;display:inline-block}.left-nav--1XcZJ .ms-Nav-navItems{margin-top:0px !important}.left-nav--1XcZJ .ms-Nav-compositeLink a,.left-nav--1XcZJ .ms-Nav-compositeLink button{border-left:3px solid var(--neutral-0);border-top:0px;border-bottom:0px}.left-nav--1XcZJ .ms-Nav-compositeLink .ms-Button-label{color:var(--neutral-100)}.left-nav--1XcZJ .ms-Nav-compositeLink .index-circle{color:var(--secondary-text);background:var(--neutral-0);border-color:var(--neutral-20);text-align:center}.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected a,.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected button{background-color:var(--communication-tint-40);border-left:3px solid var(--communication-primary)}.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected a .ms-Button-label,.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected a .overview-percent,.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected button .ms-Button-label,.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected button .overview-percent{color:var(--black)}.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected a .left-nav-icon,.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected button .left-nav-icon{color:var(--left-nav-icon)}.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected a::after,.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected button::after{border-left:0px}.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected .ms-Button-label{color:var(--light-black)}.left-nav--1XcZJ .ms-Nav-compositeLink.is-selected .index-circle{color:var(--neutral-0);background:var(--index-circle-background);border-color:var(--neutral-0)}.left-nav--1XcZJ .ms-Pivot-text{font-size:11px}.left-nav--1XcZJ .ms-Pivot-icon{font-size:9px}.left-nav--1XcZJ button{text-align:left}\
\
#side-nav-container--28pZA{max-width:25%;min-width:250px}.left-nav-panel--1foAP .ms-Panel-main{width:250px}.left-nav-panel--1foAP .ms-Panel-content{padding:0px}.left-nav-panel--1foAP .ms-Panel-content .main-nav{max-height:calc(100vh - (40px));height:calc(100vh - (40px))}\
\
.details-view-body--orzHm{height:100%}.details-view-content-pane-container--NnH1y{display:flex;flex-direction:column;height:100%;width:100%;padding-bottom:1px;box-sizing:border-box;max-height:calc(100vh - (1px + 40px + 40px))}.details-view-content-pane-container--NnH1y.reflow-ui{width:calc(100vw - (250px));max-height:calc(100vh - (40px))}.details-view-content-pane-container--NnH1y.narrow-mode--3rM_T{width:100%}.details-view-body-nav-content-layout--1r0vm{display:flex;flex-wrap:nowrap;justify-content:flex-start;align-items:flex-start;align-content:stretch;padding-left:0px;padding-right:0px;grid-template-columns:200px 1fr;grid-template-rows:1fr;width:100%;min-height:0;height:100%;grid-template-columns:250px 1fr}.details-view-body-nav-content-layout--1r0vm .ms-Pivot{border-bottom:1px solid var(--neutral-8);padding-left:12px}.details-view-body-nav-content-layout--1r0vm .details-view-body-content-pane--1iDgb{display:flex;flex-direction:column;height:100%;word-break:break-word;width:100%;overflow:auto;box-sizing:border-box;max-height:calc(100vh - (1px + 40px + 40px))}.details-view-body-nav-content-layout--1r0vm .details-view-body-content-pane--1iDgb>div{width:100%;height:auto}.details-view-body-nav-content-layout--1r0vm .details-view-body-content-pane--1iDgb .ms-MessageBar-icon i{margin-left:12px;color:var(--secondary-text)}.details-view-body-nav-content-layout--1r0vm .details-view-body-content-pane--1iDgb .view--2060h{flex-grow:1;height:100%;width:100%;display:flex;flex-direction:column;min-height:0}.details-view-body-nav-content-layout--1r0vm .details-view-body-content-pane--1iDgb .view--2060h h1{margin:0px;font-weight:600;font-size:21px;color:var(--neutral-100)}.details-view-body-nav-content-layout--1r0vm .details-view-body-content-pane--1iDgb .view--2060h b{font-weight:600}\
\
.remove-button--1EnlD{margin-left:12px;font-size:16px;line-height:24px;color:var(--negative-outcome)}@media screen and (-ms-high-contrast: active){.remove-button--1EnlD{color:inherit}}\
\
.instance-visibility-button--29Vwm{color:var(--primary-text);padding-bottom:6px}@media screen and (-ms-high-contrast: active){.instance-visibility-button--29Vwm{color:highlighttext !important}}@media screen and (-ms-high-contrast: active){.instance-visibility-button--29Vwm:focus{outline:1px highlighttext solid}}.test-instance-selected--2Lvnn{padding:2px;color:var(--neutral-0)}.test-instance-selected-hidden--1Zget{background-color:var(--neutral-60);cursor:default}.test-instance-selected-visible--3pz8V{background-color:var(--communication-primary)}.test-instance-selected-hidden-button--3FciO{background-color:transparent}\
\
`;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/DetailsView/components/action-and-cancel-buttons-component.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"actionAndCancelButtonsComponent":"action-and-cancel-buttons-component--GI-yD","actionCancelButtonCol":"action-cancel-button-col--2EdOO"};

/***/ }),

/***/ "./src/DetailsView/components/action-and-cancel-buttons-component.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/DetailsView/components/action-and-cancel-buttons-component.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1, office_ui_fabric_react_1, React, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ActionAndCancelButtonsComponent = void 0;
    class ActionAndCancelButtonsComponent extends React.Component {
        render() {
            return (React.createElement("div", { className: styles.actionAndCancelButtonsComponent, hidden: this.props.isHidden },
                React.createElement("div", { className: styles.actionCancelButtonCol },
                    React.createElement(office_ui_fabric_react_1.DefaultButton, { text: 'Cancel', onClick: this.props.cancelButtonOnClick })),
                React.createElement("div", { className: styles.actionCancelButtonCol },
                    React.createElement(office_ui_fabric_react_1.DefaultButton, { primary: true, text: this.props.primaryButtonText, onClick: this.props.primaryButtonOnClick, disabled: this.props.primaryButtonDisabled, href: this.props.primaryButtonHref, target: lodash_1.isEmpty(this.props.primaryButtonHref) ? '_self' : '_blank' }))));
        }
    }
    exports.ActionAndCancelButtonsComponent = ActionAndCancelButtonsComponent;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/DetailsView/components/common-dialog-styles.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"insightsDialogMainOverride":"insights-dialog-main-override--12zq8","dialogBody":"dialog-body--2gMoa"};

/***/ }),

/***/ "./src/DetailsView/components/details-view-overlay/settings-panel/settings/issue-filing/issue-filing-settings.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/issue-filing/components/issue-filing-settings-container.tsx"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, issue_filing_settings_container_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueFilingSettings = exports.issueFilingTitleId = void 0;
    exports.issueFilingTitleId = 'issue-filing-heading';
    exports.IssueFilingSettings = named_fc_1.NamedFC('IssueFilingSettings', props => {
        const { deps, userConfigurationStoreState } = props;
        const { issueFilingServiceProvider, userConfigMessageCreator } = deps;
        const selectedIssueFilingService = issueFilingServiceProvider.forKey(userConfigurationStoreState.bugService);
        const selectedIssueFilingServiceData = selectedIssueFilingService.getSettingsFromStoreData(userConfigurationStoreState.bugServicePropertiesMap);
        return (React.createElement(React.Fragment, null,
            React.createElement("h3", { id: exports.issueFilingTitleId }, "Issue filing"),
            React.createElement(issue_filing_settings_container_1.IssueFilingSettingsContainer, { deps: deps, selectedIssueFilingService: selectedIssueFilingService, selectedIssueFilingServiceData: selectedIssueFilingServiceData, onPropertyUpdateCallback: userConfigMessageCreator.setIssueFilingServiceProperty, onSelectedServiceChange: userConfigMessageCreator.setIssueFilingService })));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/DetailsView/components/issue-filing-dialog.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/DetailsView/components/common-dialog-styles.scss"), __webpack_require__("lodash"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/issue-filing/components/issue-filing-settings-container.tsx"), __webpack_require__("./src/DetailsView/components/action-and-cancel-buttons-component.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, styles, lodash_1, office_ui_fabric_react_1, React, issue_filing_settings_container_1, action_and_cancel_buttons_component_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueFilingDialog = void 0;
    const titleLabel = 'Specify issue filing location';
    class IssueFilingDialog extends React.Component {
        constructor(props) {
            super(props);
            this.onPrimaryButtonClick = (ev) => {
                const newData = this.state.selectedIssueFilingService.getSettingsFromStoreData(this.state.issueFilingServicePropertiesMap);
                const service = this.state.selectedIssueFilingService.key;
                const payload = {
                    issueFilingServiceName: service,
                    issueFilingSettings: newData,
                };
                this.props.deps.userConfigMessageCreator.saveIssueFilingSettings(payload);
                this.props.deps.issueFilingActionMessageCreator.fileIssue(ev, service, this.props.selectedIssueData, this.props.deps.toolData);
                this.props.onClose(ev);
            };
            this.onSelectedServiceChange = service => {
                this.setState(() => ({
                    selectedIssueFilingService: this.props.deps.issueFilingServiceProvider.forKey(service.issueFilingServiceName),
                }));
            };
            this.onPropertyUpdateCallback = payload => {
                const { issueFilingServiceName, propertyName, propertyValue } = payload;
                const selectedServiceData = this.state.selectedIssueFilingService.getSettingsFromStoreData(this.state.issueFilingServicePropertiesMap) || {};
                selectedServiceData[propertyName] = propertyValue;
                const newIssueFilingServicePropertiesMap = Object.assign(Object.assign({}, this.state.issueFilingServicePropertiesMap), { [issueFilingServiceName]: selectedServiceData });
                this.setState(() => ({
                    issueFilingServicePropertiesMap: newIssueFilingServicePropertiesMap,
                }));
            };
            this.state = this.getState(props);
        }
        getState(props) {
            return {
                issueFilingServicePropertiesMap: lodash_1.cloneDeep(props.issueFilingServicePropertiesMap),
                selectedIssueFilingService: props.selectedIssueFilingService,
            };
        }
        render() {
            const { onClose, isOpen, deps } = this.props;
            const { selectedIssueFilingService } = this.state;
            const selectedIssueFilingServiceData = this.state.selectedIssueFilingService.getSettingsFromStoreData(this.state.issueFilingServicePropertiesMap);
            const isSettingsValid = selectedIssueFilingService.isSettingsValid(selectedIssueFilingServiceData);
            return (React.createElement(office_ui_fabric_react_1.Dialog, { hidden: !isOpen, dialogContentProps: {
                    type: office_ui_fabric_react_1.DialogType.normal,
                    title: titleLabel,
                    subText: 'This configuration can be changed again in settings.',
                    showCloseButton: false,
                }, modalProps: {
                    isBlocking: false,
                    containerClassName: styles.insightsDialogMainOverride,
                    className: 'issue-filing-dialog',
                }, onDismiss: onClose },
                React.createElement(issue_filing_settings_container_1.IssueFilingSettingsContainer, { deps: deps, selectedIssueFilingService: selectedIssueFilingService, selectedIssueFilingServiceData: selectedIssueFilingServiceData, onPropertyUpdateCallback: this.onPropertyUpdateCallback, onSelectedServiceChange: this.onSelectedServiceChange }),
                React.createElement(office_ui_fabric_react_1.DialogFooter, null,
                    React.createElement(action_and_cancel_buttons_component_1.ActionAndCancelButtonsComponent, { isHidden: false, primaryButtonDisabled: isSettingsValid === false, primaryButtonOnClick: this.onPrimaryButtonClick, cancelButtonOnClick: onClose, primaryButtonText: 'File issue' }))));
        }
        componentDidUpdate(prevProps) {
            if (this.props.isOpen && lodash_1.isEqual(prevProps, this.props) === false) {
                this.setState(() => this.getState(this.props));
            }
        }
    }
    exports.IssueFilingDialog = IssueFilingDialog;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/assessments/markup.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeTerm = exports.NonBreakingSpace = exports.GreaterThanOrEqualTo = exports.CodeBlock = exports.Code = exports.Term = exports.Emphasis = exports.Tag = void 0;
    function Tag(props) {
        const isBold = props.hasOwnProperty('isBold') ? props.isBold : true;
        return isBold ? (React.createElement(CodeTerm, null,
            "<",
            props.tagName,
            ">")) : (React.createElement(Code, null,
            "<",
            props.tagName,
            ">"));
    }
    exports.Tag = Tag;
    function Emphasis(props) {
        return React.createElement("em", null, props.children);
    }
    exports.Emphasis = Emphasis;
    function Term(props) {
        return React.createElement("strong", null, props.children);
    }
    exports.Term = Term;
    function Code(props) {
        return React.createElement("span", { className: "insights-code" }, props.children);
    }
    exports.Code = Code;
    function CodeBlock(props) {
        return React.createElement("div", { className: "insights-code" }, props.children);
    }
    exports.CodeBlock = CodeBlock;
    exports.GreaterThanOrEqualTo = () => React.createElement("span", null, "\u2265");
    exports.NonBreakingSpace = () => React.createElement("span", null, "\u00A0");
    function CodeTerm(props) {
        return (React.createElement(Term, null,
            React.createElement(Code, null, props.children)));
    }
    exports.CodeTerm = CodeTerm;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/application-properties-provider.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createToolData = void 0;
    exports.createToolData = (toolName, toolVersion, scanEngineName, scanEngineVersion, environmentName) => {
        return {
            scanEngineProperties: {
                name: scanEngineName,
                version: scanEngineVersion,
            },
            applicationProperties: {
                name: toolName,
                version: toolVersion,
                environmentName: environmentName,
            },
        };
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/card-interaction-support.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.onlyUserConfigAgnosticCardInteractionsSupported = exports.onlyHighlightingSupported = exports.noCardInteractionsSupported = exports.allCardInteractionsSupported = void 0;
    exports.allCardInteractionsSupported = {
        supportsHighlighting: true,
        supportsIssueFiling: true,
        supportsCopyFailureDetails: true,
    };
    exports.noCardInteractionsSupported = {
        supportsHighlighting: false,
        supportsIssueFiling: false,
        supportsCopyFailureDetails: false,
    };
    exports.onlyHighlightingSupported = Object.assign(Object.assign({}, exports.noCardInteractionsSupported), { supportsHighlighting: true });
    exports.onlyUserConfigAgnosticCardInteractionsSupported = Object.assign(Object.assign({}, exports.allCardInteractionsSupported), { supportsIssueFiling: false });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/card-kebab-menu-button.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"kebabMenuCallout":"kebab-menu-callout--14fgT","kebabMenu":"kebab-menu--z2Gzc","kebabMenuButton":"kebab-menu-button--2aa2O"};

/***/ }),

/***/ "./src/common/components/cards/card-kebab-menu-button.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/icons/more-actions-menu-icon.tsx"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/DetailsView/components/issue-filing-dialog.tsx"), __webpack_require__("./src/common/components/toast.tsx"), __webpack_require__("./src/common/components/cards/card-kebab-menu-button.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, more_actions_menu_icon_1, office_ui_fabric_react_1, office_ui_fabric_react_2, React, issue_filing_dialog_1, toast_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CardKebabMenuButton = void 0;
    class CardKebabMenuButton extends React.Component {
        constructor(props) {
            super(props);
            this.fileIssue = (event) => {
                const { issueDetailsData, userConfigurationStoreData, deps } = this.props;
                const { issueFilingServiceProvider, issueFilingActionMessageCreator, toolData } = deps;
                const selectedBugFilingService = issueFilingServiceProvider.forKey(userConfigurationStoreData.bugService);
                const selectedBugFilingServiceData = selectedBugFilingService.getSettingsFromStoreData(userConfigurationStoreData.bugServicePropertiesMap);
                const isSettingValid = selectedBugFilingService.isSettingsValid(selectedBugFilingServiceData);
                if (isSettingValid) {
                    issueFilingActionMessageCreator.fileIssue(event, userConfigurationStoreData.bugService, issueDetailsData, toolData);
                    this.closeNeedsSettingsContent();
                }
                else {
                    this.openNeedsSettingsContent();
                }
            };
            this.copyFailureDetails = async (event) => {
                const text = this.props.deps.issueDetailsTextGenerator.buildText(this.props.issueDetailsData, this.props.deps.toolData);
                this.props.deps.detailsViewActionMessageCreator.copyIssueDetailsClicked(event);
                try {
                    await this.props.deps.navigatorUtils.copyToClipboard(text);
                }
                catch (error) {
                    this.toastRef.current.show('Failed to copy failure details. Please try again.');
                    return;
                }
                this.toastRef.current.show('Failure details copied.');
            };
            this.closeNeedsSettingsContent = () => {
                this.setState({ showNeedsSettingsContent: false });
            };
            this.toastRef = React.createRef();
            this.state = {
                showNeedsSettingsContent: false,
            };
        }
        render() {
            const menuItems = this.getMenuItems();
            if (menuItems.length === 0) {
                return null;
            }
            const handleKeyDown = (event) => {
                event.stopPropagation();
            };
            return (
            // The wrapper has to be a real element, not a <>, because we want the placeholder elements
            // the dialog/toast involve to be considered as part of the button for the purposes of layout
            // calculation in this component's parent.
            React.createElement("div", { onKeyDown: handleKeyDown },
                React.createElement(office_ui_fabric_react_1.ActionButton, { className: styles.kebabMenuButton, ariaLabel: this.props.kebabMenuAriaLabel || 'More actions', onRenderMenuIcon: more_actions_menu_icon_1.MoreActionsMenuIcon, menuProps: {
                        className: styles.kebabMenu,
                        directionalHint: office_ui_fabric_react_2.DirectionalHint.bottomRightEdge,
                        shouldFocusOnMount: true,
                        items: this.getMenuItems(),
                        calloutProps: {
                            className: styles.kebabMenuCallout,
                        },
                    } }),
                this.renderIssueFilingSettingContent(),
                this.renderCopyFailureDetailsToast()));
        }
        renderCopyFailureDetailsToast() {
            const { cardInteractionSupport } = this.props.deps;
            if (!cardInteractionSupport.supportsCopyFailureDetails) {
                return null;
            }
            return React.createElement(toast_1.Toast, { ref: this.toastRef, deps: this.props.deps });
        }
        getMenuItems() {
            const { cardInteractionSupport } = this.props.deps;
            const items = [];
            if (cardInteractionSupport.supportsIssueFiling) {
                items.push({
                    key: 'fileissue',
                    name: 'File issue',
                    iconProps: {
                        iconName: 'ladybugSolid',
                    },
                    onClick: this.fileIssue,
                });
            }
            if (cardInteractionSupport.supportsCopyFailureDetails) {
                items.push({
                    key: 'copyfailuredetails',
                    name: `Copy failure details`,
                    iconProps: {
                        iconName: 'copy',
                    },
                    onClick: this.copyFailureDetails,
                });
            }
            return items;
        }
        renderIssueFilingSettingContent() {
            const { deps, userConfigurationStoreData, issueDetailsData } = this.props;
            const { issueFilingServiceProvider, cardInteractionSupport } = deps;
            if (!cardInteractionSupport.supportsIssueFiling) {
                return null;
            }
            const selectedIssueFilingService = issueFilingServiceProvider.forKey(userConfigurationStoreData.bugService);
            const selectedIssueFilingServiceData = selectedIssueFilingService.getSettingsFromStoreData(userConfigurationStoreData.bugServicePropertiesMap);
            const needsSettingsContentProps = {
                deps,
                isOpen: this.state.showNeedsSettingsContent,
                selectedIssueFilingService,
                selectedIssueData: issueDetailsData,
                selectedIssueFilingServiceData,
                onClose: this.closeNeedsSettingsContent,
                issueFilingServicePropertiesMap: userConfigurationStoreData.bugServicePropertiesMap,
            };
            return React.createElement(issue_filing_dialog_1.IssueFilingDialog, Object.assign({}, needsSettingsContentProps));
        }
        openNeedsSettingsContent() {
            this.setState({ showNeedsSettingsContent: true });
        }
    }
    exports.CardKebabMenuButton = CardKebabMenuButton;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/class-name-card-row.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/get-labelled-string-property-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, get_labelled_string_property_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ClassNameCardRow = void 0;
    exports.ClassNameCardRow = get_labelled_string_property_card_row_1.GetLabelledStringPropertyCardRow('Class name');
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/content-description-card-row.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/get-labelled-string-property-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, get_labelled_string_property_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ContentDescriptionCardRow = void 0;
    exports.ContentDescriptionCardRow = get_labelled_string_property_card_row_1.GetLabelledStringPropertyCardRow('Content description');
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/failed-instances-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/common/components/cards/result-section.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, result_section_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FailedInstancesSection = void 0;
    exports.FailedInstancesSection = named_fc_1.NamedFC('FailedInstancesSection', ({ cardsViewData, deps, userConfigurationStoreData, scanMetadata, shouldAlertFailuresCount, }) => {
        if (cardsViewData == null || cardsViewData.cards == null) {
            return null;
        }
        const count = cardsViewData.cards.fail.reduce((total, rule) => {
            return total + rule.nodes.length;
        }, 0);
        return (React.createElement(result_section_1.ResultSection, { deps: deps, title: "Failed instances", results: cardsViewData.cards.fail, containerClassName: null, outcomeType: "fail", badgeCount: count, userConfigurationStoreData: userConfigurationStoreData, targetAppInfo: scanMetadata.targetAppInfo, shouldAlertFailuresCount: shouldAlertFailuresCount, visualHelperEnabled: cardsViewData.visualHelperEnabled, allCardsCollapsed: cardsViewData.allCardsCollapsed }));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/fix-instruction-color-box.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"fixInstructionColorBox":"fix-instruction-color-box--HXJ1A","screenReaderOnly":"screen-reader-only--1uWLQ"};

/***/ }),

/***/ "./src/common/components/cards/get-labelled-string-property-card-row.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/common/components/cards/simple-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1, React, named_fc_1, simple_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GetLabelledStringPropertyCardRow = void 0;
    exports.GetLabelledStringPropertyCardRow = (label, contentClassName) => {
        return named_fc_1.NamedFC('StringPropertyCardRowProps', props => {
            if (lodash_1.isEmpty(props.propertyData)) {
                return null;
            }
            return (React.createElement(simple_card_row_1.SimpleCardRow, { label: label, content: props.propertyData, rowKey: `${label}-${props.index}`, contentClassName: contentClassName }));
        });
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/how-to-check-card-row.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/how-to-check-text.tsx"), __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/common/components/cards/simple-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, how_to_check_text_1, React, named_fc_1, simple_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HowToCheckWebCardRow = void 0;
    exports.HowToCheckWebCardRow = named_fc_1.NamedFC('HowToCheckWebCardRow', (_a) => {
        var props = __rest(_a, []);
        return (React.createElement(simple_card_row_1.SimpleCardRow, { label: "How to check", content: React.createElement(how_to_check_text_1.HowToCheckText, { id: props.propertyData }), rowKey: `how-to-check-row-${props.index}` }));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/how-to-check-text.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"multiLineTextNoBullet":"multi-line-text-no-bullet--3igrU","multiLineTextYesBullet":"multi-line-text-yes-bullet--ebJpE","combinationLists":"combination-lists--2hRoK"};

/***/ }),

/***/ "./src/common/components/cards/how-to-check-text.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/new-tab-link.tsx"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/common/components/cards/how-to-check-text.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, new_tab_link_1, named_fc_1, React, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HowToCheckText = void 0;
    exports.HowToCheckText = named_fc_1.NamedFC('HowToCheckText', props => {
        let checkText;
        switch (props.id) {
            case 'aria-input-field-name': {
                checkText = (React.createElement("div", null,
                    "Inspect the element using the",
                    ' ',
                    React.createElement(new_tab_link_1.NewTabLink, { href: "https://developers.google.com/web/updates/2018/01/devtools" }, "Accessibility pane in the browser Developer Tools"),
                    ' ',
                    "to verify that the field's accessible name is complete without its associated",
                    ' ',
                    React.createElement("b", null,
                        '<',
                        "label",
                        '>'),
                    "."));
                break;
            }
            case 'color-contrast': {
                checkText = (React.createElement("div", { classname: styles.combinationLists },
                    React.createElement("ul", { className: styles.multiLineTextYesBullet },
                        React.createElement("li", { "list-style-type": "disc" }, "If the text is intended to be invisible, it passes."),
                        React.createElement("li", { "list-style-type": "disc" },
                            "If the text is intended to be visible, use",
                            ' ',
                            React.createElement(new_tab_link_1.NewTabLink, { href: "https://go.microsoft.com/fwlink/?linkid=2075365" }, "Accessibility Insights for Windows"),
                            ' ',
                            "(or the",
                            ' ',
                            React.createElement(new_tab_link_1.NewTabLink, { href: "https://developer.paciellogroup.com/resources/contrastanalyser/" }, "Colour Contrast Analyser"),
                            ' ',
                            "if you're testing on a Mac) to manually verify that it has sufficient contrast compared to the background. If the background is an image or gradient, test an area where contrast appears to be lowest.")),
                    React.createElement("ul", { className: styles.multiLineTextNoBullet },
                        React.createElement("li", null,
                            "For detailed test instructions, see",
                            ' ',
                            React.createElement("b", null,
                                "Assessment ",
                                '>',
                                " Text legibility ",
                                '>',
                                " Contrast"),
                            "."))));
                break;
            }
            case 'link-in-text-block': {
                checkText = (React.createElement("ul", { className: styles.multiLineTextNoBullet },
                    React.createElement("li", null, "Manually verify that the link text EITHER has a contrast ratio of at least 3:1 compared to surrounding text OR has a distinct visual style (such as underlined, bolded, or italicized)."),
                    React.createElement("li", null,
                        "To measure contrast, use",
                        ' ',
                        React.createElement(new_tab_link_1.NewTabLink, { href: "https://go.microsoft.com/fwlink/?linkid=2075365" }, "Accessibility Insights for Windows"),
                        ' ',
                        "(or the",
                        ' ',
                        React.createElement(new_tab_link_1.NewTabLink, { href: "https://developer.paciellogroup.com/resources/contrastanalyser/" }, "Colour Contrast Analyser"),
                        ' ',
                        "if you're testing on a Mac).")));
                break;
            }
            case 'th-has-data-cells': {
                checkText = (React.createElement("div", null, "Examine the header cell in the context of the table to verify that it has no data cells."));
                break;
            }
            default: {
                break;
            }
        }
        return checkText;
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/how-to-fix-android-card-row.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/assessments/markup.tsx"), __webpack_require__("lodash"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/common/components/cards/simple-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, markup_1, lodash_1, named_fc_1, simple_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HowToFixAndroidCardRow = void 0;
    exports.HowToFixAndroidCardRow = named_fc_1.NamedFC('HowToFixAndroidCardRow', props => {
        return (React.createElement(simple_card_row_1.SimpleCardRow, { label: "How to fix", content: React.createElement("span", null, getHowToFixContent(props)), rowKey: `how-to-fix-row-${props.index}`, contentClassName: "how-to-fix-card-row" }));
    });
    function getHowToFixContent(props) {
        const propertyData = props.propertyData;
        if (lodash_1.isEmpty(propertyData.howToFix)) {
            return [];
        }
        let howToFixSplit = [{ str: propertyData.howToFix }];
        const result = [];
        if (!lodash_1.isEmpty(propertyData.formatAsCode)) {
            propertyData.formatAsCode.forEach(item => {
                if (lodash_1.isEmpty(item)) {
                    throw 'pattern cannot be empty';
                }
                howToFixSplit = getHowToFixSplitsForPattern(item, howToFixSplit);
            });
        }
        howToFixSplit.forEach((item, index) => {
            const key = `strong-how-to-fix-${props.index}-${index}`;
            result.push(lodash_1.isEmpty(item.str) ? (React.createElement(markup_1.Term, { key: key }, item.match)) : (React.createElement("span", { key: key }, props.deps.fixInstructionProcessor.process(item.str))));
        });
        return result;
    }
    function getHowToFixSplitsForPattern(pattern, previousHowToFixSplit) {
        const newHowToFixSplit = [];
        previousHowToFixSplit.forEach(prop => {
            if (!lodash_1.isEmpty(prop.str)) {
                let str = prop.str;
                while (str.length > 0 && str.indexOf(pattern) >= 0) {
                    const startIndex = str.indexOf(pattern);
                    if (startIndex > 0) {
                        newHowToFixSplit.push({
                            str: str.substr(0, startIndex),
                        });
                    }
                    newHowToFixSplit.push({
                        match: pattern,
                    });
                    str = str.substr(startIndex + pattern.length);
                }
                if (str.length > 0) {
                    newHowToFixSplit.push({
                        str: str,
                    });
                }
            }
            else if (!lodash_1.isEmpty(prop.match)) {
                newHowToFixSplit.push({
                    match: prop.match,
                });
            }
        });
        return newHowToFixSplit;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/how-to-fix-card-row.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"howToFixContent":"how-to-fix-content--2-Pc1"};

/***/ }),

/***/ "./src/common/components/cards/how-to-fix-card-row.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/injected/components/details-dialog.tsx"), __webpack_require__("./src/common/components/fix-instruction-panel.tsx"), __webpack_require__("./src/common/components/cards/how-to-fix-card-row.scss"), __webpack_require__("./src/common/components/cards/simple-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1, details_dialog_1, fix_instruction_panel_1, styles, simple_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HowToFixWebCardRow = void 0;
    exports.HowToFixWebCardRow = named_fc_1.NamedFC('HowToFixWebCardRow', (_a) => {
        var { deps } = _a, props = __rest(_a, ["deps"]);
        const { any: anyOf, all, none } = props.propertyData;
        const renderFixInstructionsContent = () => {
            return (React.createElement("div", { className: styles.howToFixContent },
                React.createElement(fix_instruction_panel_1.FixInstructionPanel, { deps: deps, checkType: details_dialog_1.CheckType.All, checks: all.concat(none).map(turnStringToMessageObject), renderTitleElement: renderFixInstructionsTitleElement }),
                React.createElement(fix_instruction_panel_1.FixInstructionPanel, { deps: deps, checkType: details_dialog_1.CheckType.Any, checks: anyOf.map(turnStringToMessageObject), renderTitleElement: renderFixInstructionsTitleElement })));
        };
        const turnStringToMessageObject = (s) => {
            return { message: s };
        };
        const renderFixInstructionsTitleElement = (titleText) => {
            return React.createElement("div", null, titleText);
        };
        return (React.createElement(simple_card_row_1.SimpleCardRow, { label: "How to fix", content: renderFixInstructionsContent(), rowKey: `how-to-fix-row-${props.index}` }));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/instance-details-footer.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"foot":"foot--1bb1r","highlightStatus":"highlight-status--1IQGd"};

/***/ }),

/***/ "./src/common/components/cards/instance-details-footer.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/icons/highlight-status-icons.tsx"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/common/components/cards/card-kebab-menu-button.tsx"), __webpack_require__("./src/common/components/cards/instance-details-footer.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, highlight_status_icons_1, named_fc_1, office_ui_fabric_react_1, React, card_kebab_menu_button_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InstanceDetailsFooter = void 0;
    exports.InstanceDetailsFooter = named_fc_1.NamedFC('InstanceDetailsFooter', props => {
        const { deps, userConfigurationStoreData, result, rule, targetAppInfo } = props;
        const { cardInteractionSupport } = deps;
        const supportsAnyActions = cardInteractionSupport.supportsIssueFiling ||
            cardInteractionSupport.supportsCopyFailureDetails;
        const { supportsHighlighting } = cardInteractionSupport;
        if (!supportsHighlighting && !supportsAnyActions) {
            return null;
        }
        const renderKebabMenu = () => {
            if (!supportsAnyActions) {
                return null;
            }
            const issueDetailsData = deps.unifiedResultToIssueFilingDataConverter.convert(result, rule, targetAppInfo);
            const kebabMenuAriaLabel = `More Actions for failure instance ${result.identifiers.identifier} in rule ${rule.id}`;
            return (React.createElement(card_kebab_menu_button_1.CardKebabMenuButton, { deps: deps, userConfigurationStoreData: userConfigurationStoreData, issueDetailsData: issueDetailsData, kebabMenuAriaLabel: kebabMenuAriaLabel }));
        };
        const renderHighlightStatus = () => {
            if (!supportsHighlighting) {
                return null;
            }
            const highlightState = result.highlightStatus;
            const label = 'Highlight ' + highlightState;
            const icon = {
                unavailable: React.createElement(highlight_status_icons_1.HighlightUnavailableIcon, null),
                visible: React.createElement(highlight_status_icons_1.HighlightVisibleIcon, null),
                hidden: React.createElement(highlight_status_icons_1.HighlightHiddenIcon, null),
            }[highlightState];
            return (React.createElement("div", { className: styles.highlightStatus },
                icon,
                React.createElement(office_ui_fabric_react_1.Label, null, label)));
        };
        return (React.createElement("div", { className: styles.foot },
            renderHighlightStatus(),
            renderKebabMenu()));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/instance-details-group.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"instanceDetailsList":"instance-details-list--2Beza"};

/***/ }),

/***/ "./src/common/components/cards/instance-details-group.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/common/configs/unified-result-property-configurations.tsx"), __webpack_require__("./src/common/components/cards/instance-details.tsx"), __webpack_require__("./src/common/components/cards/instance-details-group.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, unified_result_property_configurations_1, instance_details_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InstanceDetailsGroup = exports.ruleContentAutomationId = void 0;
    exports.ruleContentAutomationId = 'cards-rule-content';
    exports.InstanceDetailsGroup = named_fc_1.NamedFC('InstanceDetailsGroup', props => {
        const { deps, rule, userConfigurationStoreData, targetAppInfo } = props;
        const { nodes } = rule;
        const unifiedRule = {
            id: rule.id,
            description: rule.description,
            url: rule.url,
            guidance: rule.guidance,
        };
        return (React.createElement("ul", { "data-automation-id": exports.ruleContentAutomationId, className: styles.instanceDetailsList, "aria-label": "instances with path, snippet and how to resolve information" }, nodes.map((node, index) => (React.createElement("li", { key: `instance-details-${index}` },
            React.createElement(instance_details_1.InstanceDetails, Object.assign({}, { index }, { deps: deps, result: node, getPropertyConfigById: unified_result_property_configurations_1.getPropertyConfiguration, userConfigurationStoreData: userConfigurationStoreData, rule: unifiedRule, targetAppInfo: targetAppInfo })))))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/instance-details.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("classnames"), __webpack_require__("./src/common/constants/keycode-constants.ts"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/reports/components/instance-details.scss"), __webpack_require__("./src/common/components/cards/instance-details-footer.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, classNames, keycode_constants_1, named_fc_1, lodash_1, React, instance_details_scss_1, instance_details_footer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InstanceDetails = exports.instanceCardAutomationId = void 0;
    exports.instanceCardAutomationId = 'instance-card';
    exports.InstanceDetails = named_fc_1.NamedFC('InstanceDetails', props => {
        const { result, index, deps, userConfigurationStoreData, rule, targetAppInfo } = props;
        const isHighlightSupported = deps.cardInteractionSupport.supportsHighlighting;
        const renderCardRowsForPropertyBag = (propertyBag) => {
            let propertyIndex = 0;
            const cardRows = [];
            lodash_1.forOwn(propertyBag, (propertyData, propertyName) => {
                const propertyConfig = deps.getPropertyConfigById(propertyName);
                if (!lodash_1.isEmpty(propertyConfig)) {
                    const CardRow = propertyConfig.cardRow;
                    ++propertyIndex;
                    cardRows.push(React.createElement(CardRow, { deps: deps, propertyData: propertyData, index: index, key: `${propertyName}-${propertyIndex}` }));
                }
            });
            return React.createElement(React.Fragment, null, cardRows);
        };
        const cardClickHandler = (event) => {
            if (isHighlightSupported) {
                deps.cardSelectionMessageCreator.toggleCardSelection(result.ruleId, result.uid, event);
            }
        };
        const cardKeyPressHandler = (event) => {
            if (event.keyCode === keycode_constants_1.KeyCodeConstants.ENTER ||
                event.keyCode === keycode_constants_1.KeyCodeConstants.SPACEBAR) {
                event.preventDefault();
                cardClickHandler(event);
            }
        };
        const instanceDetailsCardStyling = classNames({
            [instance_details_scss_1.instanceDetailsCard]: true,
            [instance_details_scss_1.selected]: isHighlightSupported ? result.isSelected : false,
        });
        const instanceDetailsCardContainerStyling = classNames({
            [instance_details_scss_1.instanceDetailsCardContainer]: true,
            [instance_details_scss_1.selected]: isHighlightSupported ? result.isSelected : false,
        });
        const cardAriaLabel = `${result.identifiers && result.identifiers.identifier ? result.identifiers.identifier : ''} card`;
        return (React.createElement("div", { "data-automation-id": exports.instanceCardAutomationId, className: instanceDetailsCardContainerStyling, role: "table" },
            React.createElement("div", { className: instanceDetailsCardStyling, tabIndex: 0, onClick: cardClickHandler, onKeyDown: cardKeyPressHandler, "aria-selected": result.isSelected, "aria-label": cardAriaLabel, role: "row" },
                React.createElement("div", { role: "gridcell" },
                    React.createElement("table", { className: instance_details_scss_1.reportInstanceTable },
                        React.createElement("tbody", null,
                            renderCardRowsForPropertyBag(result.identifiers),
                            renderCardRowsForPropertyBag(result.descriptors),
                            renderCardRowsForPropertyBag(result.resolution))),
                    React.createElement(instance_details_footer_1.InstanceDetailsFooter, { deps: deps, result: result, userConfigurationStoreData: userConfigurationStoreData, rule: rule, targetAppInfo: targetAppInfo })))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/path-card-row.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/get-labelled-string-property-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, get_labelled_string_property_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PathCardRow = void 0;
    exports.PathCardRow = get_labelled_string_property_card_row_1.GetLabelledStringPropertyCardRow('Path');
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/result-section-content.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/report-sections/no-failed-instances-congrats.tsx"), __webpack_require__("./src/common/components/cards/rules-with-instances.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, no_failed_instances_congrats_1, rules_with_instances_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResultSectionContent = void 0;
    exports.ResultSectionContent = named_fc_1.NamedFC('ResultSectionContent', props => {
        const { results, outcomeType, fixInstructionProcessor, deps, userConfigurationStoreData, targetAppInfo, } = props;
        if (results.length === 0) {
            return React.createElement(no_failed_instances_congrats_1.NoFailedInstancesCongrats, { outcomeType: outcomeType, deps: props.deps });
        }
        return (React.createElement(React.Fragment, null,
            React.createElement(deps.cardsVisualizationModifierButtons, Object.assign({}, props)),
            React.createElement(rules_with_instances_1.RulesWithInstances, { deps: deps, rules: results, outcomeType: outcomeType, fixInstructionProcessor: fixInstructionProcessor, userConfigurationStoreData: userConfigurationStoreData, targetAppInfo: targetAppInfo })));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/result-section-title.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"resultSectionTitle":"result-section-title--27ZOL","title":"title--nA1u1","outcomeChipContainer":"outcome-chip-container--1Vd7P"};

/***/ }),

/***/ "./src/common/components/cards/result-section-title.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/outcome-chip.tsx"), __webpack_require__("./src/common/components/cards/result-section-title.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, outcome_chip_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResultSectionTitle = void 0;
    exports.ResultSectionTitle = named_fc_1.NamedFC('ResultSectionTitle', props => {
        const singularMessageSubject = props.outcomeType === 'review' ? 'instance to review' : 'failure';
        const pluralMessageSubject = props.outcomeType === 'review' ? 'instances to review' : 'failures';
        const alertTerm = props.badgeCount !== 1 ? `${pluralMessageSubject} were` : `${singularMessageSubject} was`;
        const alertingFailuresCount = (React.createElement("span", { role: "alert" },
            props.badgeCount,
            " ",
            alertTerm,
            " detected."));
        return (React.createElement("span", { className: styles.resultSectionTitle },
            React.createElement("span", { className: "screen-reader-only" },
                props.title,
                ' ',
                props.shouldAlertFailuresCount ? alertingFailuresCount : props.badgeCount),
            React.createElement("span", { className: styles.title, "aria-hidden": "true" }, props.title),
            React.createElement("span", { className: styles.outcomeChipContainer, "aria-hidden": "true" },
                React.createElement(outcome_chip_1.OutcomeChip, { outcomeType: props.outcomeType, count: props.badgeCount }))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/result-section.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"resultSection":"result-section--1FLO5","titleContainer":"title-container--1CFvU","collapsibleControl":"collapsible-control--ey-Vd"};

/***/ }),

/***/ "./src/common/components/cards/result-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("@uifabric/utilities"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/common/components/cards/result-section-content.tsx"), __webpack_require__("./src/common/components/cards/result-section-title.tsx"), __webpack_require__("./src/common/components/cards/result-section.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, utilities_1, named_fc_1, React, result_section_content_1, result_section_title_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResultSection = exports.resultSectionAutomationId = void 0;
    exports.resultSectionAutomationId = 'result-section';
    exports.ResultSection = named_fc_1.NamedFC('ResultSection', props => {
        const { containerClassName } = props;
        return (React.createElement("div", { className: utilities_1.css(containerClassName, styles.resultSection), "data-automation-id": exports.resultSectionAutomationId },
            React.createElement("h2", null,
                React.createElement(result_section_title_1.ResultSectionTitle, Object.assign({}, props))),
            React.createElement(result_section_content_1.ResultSectionContent, Object.assign({}, props))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/rule-content.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/common/components/cards/instance-details-group.tsx"), __webpack_require__("./src/common/components/cards/rule-resources.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, instance_details_group_1, rule_resources_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RuleContent = void 0;
    exports.RuleContent = named_fc_1.NamedFC('RuleContent', props => {
        return (React.createElement(React.Fragment, null,
            React.createElement(rule_resources_1.RuleResources, Object.assign({}, props)),
            React.createElement(instance_details_group_1.InstanceDetailsGroup, Object.assign({}, props))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/rule-resources.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"ruleMoreResources":"rule-more-resources--3PCDe","moreResourcesTitle":"more-resources-title--17xOw","ruleDetailsId":"rule-details-id--ie-v-"};

/***/ }),

/***/ "./src/common/components/cards/rule-resources.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/guidance-links.tsx"), __webpack_require__("./src/common/components/guidance-tags.tsx"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/common/components/cards/rule-resources.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, guidance_links_1, guidance_tags_1, named_fc_1, lodash_1, React, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RuleResources = void 0;
    exports.RuleResources = named_fc_1.NamedFC('RuleResources', ({ deps, rule }) => {
        if (rule.url == null && lodash_1.isEmpty(rule.guidance)) {
            return null;
        }
        const renderTitle = () => (React.createElement("div", { className: styles.moreResourcesTitle }, "Resources for this rule"));
        const renderRuleLink = () => {
            if (rule.url == null) {
                return null;
            }
            const ruleId = rule.id;
            const ruleUrl = rule.url;
            return (React.createElement("span", { className: styles.ruleDetailsId },
                React.createElement(deps.LinkComponent, { href: ruleUrl },
                    "More information about ",
                    ruleId)));
        };
        const renderGuidanceLinks = () => (React.createElement(guidance_links_1.GuidanceLinks, { links: rule.guidance, LinkComponent: deps.LinkComponent }));
        const renderGuidanceTags = () => React.createElement(guidance_tags_1.GuidanceTags, { deps: deps, links: rule.guidance });
        return (React.createElement("div", { className: styles.ruleMoreResources },
            renderTitle(),
            renderRuleLink(),
            React.createElement("span", null,
                renderGuidanceLinks(),
                renderGuidanceTags())));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/rules-with-instances.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"ruleDetailsGroup":"rule-details-group--39A1d","collapsibleRuleDetailsGroup":"collapsible-rule-details-group--3aN3u"};

/***/ }),

/***/ "./src/common/components/cards/rules-with-instances.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/outcome-type.tsx"), __webpack_require__("./src/reports/components/report-sections/minimal-rule-header.tsx"), __webpack_require__("./src/common/components/cards/rule-content.tsx"), __webpack_require__("./src/common/components/cards/rules-with-instances.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, outcome_type_1, minimal_rule_header_1, rule_content_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RulesWithInstances = exports.ruleDetailsGroupAutomationId = exports.ruleGroupAutomationId = void 0;
    exports.ruleGroupAutomationId = 'cards-rule-group';
    exports.ruleDetailsGroupAutomationId = 'rule-details-group';
    exports.RulesWithInstances = named_fc_1.NamedFC('RulesWithInstances', ({ rules, outcomeType, fixInstructionProcessor, deps, userConfigurationStoreData, targetAppInfo, }) => {
        const getCollapsibleComponentProps = (rule, idx, buttonAriaLabel) => {
            return {
                id: rule.id,
                key: `summary-details-${idx + 1}`,
                header: React.createElement(minimal_rule_header_1.MinimalRuleHeader, { key: rule.id, rule: rule, outcomeType: outcomeType }),
                content: (React.createElement(rule_content_1.RuleContent, { key: `${rule.id}-rule-group`, deps: deps, rule: rule, fixInstructionProcessor: fixInstructionProcessor, userConfigurationStoreData: userConfigurationStoreData, targetAppInfo: targetAppInfo })),
                containerAutomationId: exports.ruleGroupAutomationId,
                containerClassName: styles.collapsibleRuleDetailsGroup,
                buttonAriaLabel: buttonAriaLabel,
                headingLevel: 3,
                deps: deps,
                isExpanded: rule.isExpanded,
            };
        };
        return (React.createElement("div", { className: styles.ruleDetailsGroup, "data-automation-id": exports.ruleDetailsGroupAutomationId }, rules.map((rule, idx) => {
            const { pastTense } = outcome_type_1.outcomeTypeSemantics[outcomeType];
            const buttonAriaLabel = `${rule.id} ${rule.nodes.length} ${pastTense} ${rule.description}`;
            const CollapsibleComponent = deps.collapsibleControl(getCollapsibleComponentProps(rule, idx, buttonAriaLabel));
            return CollapsibleComponent;
        })));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/simple-card-row.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("@uifabric/utilities"), __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/reports/components/instance-details.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, utilities_1, React, named_fc_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleCardRow = void 0;
    exports.SimpleCardRow = named_fc_1.NamedFC('SimpleCardRow', ({ label: givenLabel, content, rowKey, contentClassName }) => {
        const contentStyling = utilities_1.css(styles.instanceListRowContent, contentClassName);
        return (React.createElement("tr", { className: styles.row, key: rowKey },
            React.createElement("th", { className: utilities_1.css(styles.label, 'report-instance-table-label-overrides') }, givenLabel),
            React.createElement("td", { className: contentStyling }, content)));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/snippet-card-row.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/get-labelled-string-property-card-row.tsx"), __webpack_require__("./src/reports/components/instance-details.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, get_labelled_string_property_card_row_1, instance_details_scss_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SnippetCardRow = void 0;
    exports.SnippetCardRow = get_labelled_string_property_card_row_1.GetLabelledStringPropertyCardRow('Snippet', instance_details_scss_1.contentSnipppet);
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/cards/text-card-row.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/get-labelled-string-property-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, get_labelled_string_property_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TextCardRow = void 0;
    exports.TextCardRow = get_labelled_string_property_card_row_1.GetLabelledStringPropertyCardRow('Text');
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/copy-issue-details-button.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/common/icons/copy-icon.tsx"), __webpack_require__("./src/common/components/toast.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, office_ui_fabric_react_1, React, copy_icon_1, toast_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CopyIssueDetailsButton = void 0;
    class CopyIssueDetailsButton extends React.Component {
        constructor(props) {
            super(props);
            this.copyButtonClicked = async (event) => {
                this.toastRef.current.show('Failure details copied.');
                if (this.props.onClick) {
                    this.props.onClick(event);
                }
                try {
                    await this.props.deps.navigatorUtils.copyToClipboard(this.getIssueDetailsText(this.props.issueDetailsData));
                }
                catch (error) {
                    this.toastRef.current.show('Failed to copy failure details. Please try again.');
                    return;
                }
                this.toastRef.current.show('Failure details copied.');
            };
            this.toastRef = React.createRef();
        }
        getIssueDetailsText(issueData) {
            return this.props.deps.issueDetailsTextGenerator.buildText(issueData, this.props.deps.toolData);
        }
        render() {
            return (React.createElement(React.Fragment, null,
                React.createElement(toast_1.Toast, { ref: this.toastRef, deps: this.props.deps }),
                React.createElement(office_ui_fabric_react_1.DefaultButton, { className: 'copy-issue-details-button', onClick: this.copyButtonClicked },
                    React.createElement(copy_icon_1.CopyIcon, null),
                    React.createElement("div", { className: "ms-Button-label" }, "Copy failure details"))));
        }
    }
    exports.CopyIssueDetailsButton = CopyIssueDetailsButton;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/fix-instruction-panel.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"insightsFixInstructionList":"insights-fix-instruction-list--1vUZj","fixInstructionColorBox":"fix-instruction-color-box--2DKsr","screenReaderOnly":"screen-reader-only--QfHg0"};

/***/ }),

/***/ "./src/common/components/fix-instruction-panel.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/injected/components/details-dialog.tsx"), __webpack_require__("react"), __webpack_require__("./src/common/components/fix-instruction-panel.scss"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, details_dialog_1, React, styles, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FixInstructionPanel = void 0;
    exports.FixInstructionPanel = named_fc_1.NamedFC('FixInstructionPanel', props => {
        const { fixInstructionProcessor } = props.deps;
        const getPanelTitle = (checkType, checkCount) => {
            if (checkCount === 1) {
                return 'Fix the following:';
            }
            if (checkType === details_dialog_1.CheckType.Any) {
                return 'Fix ONE of the following:';
            }
            else {
                return 'Fix ALL of the following:';
            }
        };
        const renderInstructions = (checkType) => {
            const instructionList = props.checks.map((check, checkIndex) => {
                return (React.createElement("li", { key: `instruction-${details_dialog_1.CheckType[checkType]}-${checkIndex + 1}` }, fixInstructionProcessor.process(check.message)));
            });
            return instructionList;
        };
        if (props.checks.length === 0) {
            return null;
        }
        const title = getPanelTitle(props.checkType, props.checks.length);
        return (React.createElement("div", null,
            props.renderTitleElement(title),
            React.createElement("ul", { className: styles.insightsFixInstructionList }, renderInstructions(props.checkType))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/fix-instruction-processor.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/components/cards/fix-instruction-color-box.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FixInstructionProcessor = void 0;
    class FixInstructionProcessor {
        constructor() {
            this.colorValueMatcher = `(#[0-9a-f]{6})`;
            this.foregroundColorText = 'foreground color: ';
            // the following warnings can be disabled because the values are actually constant strings and the string template is used merely for ease of reading
            // eslint-disable-next-line security/detect-non-literal-regexp
            this.foregroundRegExp = new RegExp(`${this.foregroundColorText}${this.colorValueMatcher}`, 'i');
            this.backgroundColorText = 'background color: ';
            // eslint-disable-next-line security/detect-non-literal-regexp
            this.backgroundRegExp = new RegExp(`${this.backgroundColorText}${this.colorValueMatcher}`, 'i');
        }
        process(fixInstruction) {
            const matches = this.getColorMatches(fixInstruction);
            return this.splitFixInstruction(fixInstruction, matches);
        }
        getColorMatches(fixInstruction) {
            const foregroundMatch = this.getColorMatch(fixInstruction, this.foregroundRegExp);
            const backgroundMatch = this.getColorMatch(fixInstruction, this.backgroundRegExp);
            return [foregroundMatch, backgroundMatch].filter(match => match != null);
        }
        getColorMatch(fixInstruction, colorRegex) {
            if (!colorRegex.test(fixInstruction)) {
                return null;
            }
            const match = colorRegex.exec(fixInstruction);
            if (match == null || match[1] == null) {
                return null;
            }
            const colorHexValue = match[1];
            return {
                splitIndex: match.index + this.foregroundColorText.length + colorHexValue.length,
                colorHexValue,
            };
        }
        splitFixInstruction(fixInstruction, matches) {
            const sortedMatches = matches.sort((a, b) => a.splitIndex - b.splitIndex);
            if (sortedMatches.length === 0) {
                return React.createElement(React.Fragment, null, fixInstruction);
            }
            let insertionIndex = 0;
            let keyIndex = 0;
            const result = [];
            sortedMatches.forEach(match => {
                const endIndex = match.splitIndex - match.colorHexValue.length;
                const substring = fixInstruction.substring(insertionIndex, endIndex);
                result.push(React.createElement("span", { key: `instruction-split-${keyIndex++}` }, substring));
                result.push(this.createColorBox(match.colorHexValue, keyIndex++));
                insertionIndex = endIndex;
            });
            const coda = fixInstruction.substr(insertionIndex);
            result.push(React.createElement("span", { key: `instruction-split-${keyIndex++}` }, coda));
            return (React.createElement(React.Fragment, null,
                React.createElement("span", { "aria-hidden": "true" }, result),
                React.createElement("span", { className: styles.screenReaderOnly }, fixInstruction)));
        }
        createColorBox(colorHexValue, keyIndex) {
            return (React.createElement("span", { key: `instruction-split-${keyIndex}`, className: styles.fixInstructionColorBox, style: { backgroundColor: colorHexValue } }));
        }
    }
    exports.FixInstructionProcessor = FixInstructionProcessor;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/guidance-links.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/scanner/rule-to-links-mappings.ts"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1, React, rule_to_links_mappings_1, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GuidanceLinks = void 0;
    exports.GuidanceLinks = named_fc_1.NamedFC('GuidanceLinks', (props) => {
        const { links, classNameForDiv } = props;
        if (lodash_1.isEmpty(links)) {
            return null;
        }
        const renderLinks = () => {
            const linksToRender = getLinksWithoutBestPracticeWhenWCAGPresent();
            return linksToRender.map((link, index) => {
                return renderLink(link, index, linksToRender.length);
            });
        };
        const getLinksWithoutBestPracticeWhenWCAGPresent = () => {
            return links.length === 1 ? links : links.filter(link => link.text !== rule_to_links_mappings_1.BestPractice.text);
        };
        const renderLink = (link, index, length) => {
            const addComma = index !== length - 1;
            const comma = addComma ? React.createElement("span", null, ",\u00A0") : null;
            const LinkComponent = props.LinkComponent;
            return (React.createElement(React.Fragment, { key: `guidance-link-${index}` },
                React.createElement(LinkComponent, { href: link.href, onClick: event => event.stopPropagation() }, link.text.toUpperCase()),
                comma));
        };
        const spanClassName = classNameForDiv || 'guidance-links';
        return React.createElement("span", { className: spanClassName }, renderLinks());
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/guidance-tags.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GuidanceTags = void 0;
    exports.GuidanceTags = named_fc_1.NamedFC('GuidanceTags', props => {
        const { links, deps } = props;
        if (lodash_1.isEmpty(links)) {
            return null;
        }
        const tags = deps.getGuidanceTagsFromGuidanceLinks(links);
        if (lodash_1.isEmpty(tags)) {
            return null;
        }
        const tagElements = tags.map((tag, index) => {
            return React.createElement("span", { key: index }, tag.displayText);
        });
        return React.createElement("span", { className: "guidance-tags" }, tagElements);
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/issue-filing-button.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/common/icons/lady-bug-solid-icon.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, office_ui_fabric_react_1, React, lady_bug_solid_icon_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueFilingButton = void 0;
    class IssueFilingButton extends React.Component {
        constructor(props) {
            super(props);
            this.closeNeedsSettingsContent = () => {
                this.setState({ showNeedsSettingsContent: false });
            };
            this.onClickFileIssueButton = (event) => {
                const { issueDetailsData, userConfigurationStoreData, deps } = this.props;
                const { issueFilingServiceProvider, issueFilingActionMessageCreator, toolData } = deps;
                const selectedBugFilingService = issueFilingServiceProvider.forKey(userConfigurationStoreData.bugService);
                const selectedBugFilingServiceData = selectedBugFilingService.getSettingsFromStoreData(userConfigurationStoreData.bugServicePropertiesMap);
                const isSettingValid = selectedBugFilingService.isSettingsValid(selectedBugFilingServiceData);
                if (isSettingValid) {
                    issueFilingActionMessageCreator.fileIssue(event, userConfigurationStoreData.bugService, issueDetailsData, toolData);
                    this.closeNeedsSettingsContent();
                }
                else {
                    this.openNeedsSettingsContent();
                }
            };
            this.state = {
                showNeedsSettingsContent: false,
            };
        }
        render() {
            const { issueDetailsData, userConfigurationStoreData, deps } = this.props;
            const { issueFilingServiceProvider } = deps;
            const selectedIssueFilingService = issueFilingServiceProvider.forKey(userConfigurationStoreData.bugService);
            const selectedIssueFilingServiceData = selectedIssueFilingService.getSettingsFromStoreData(userConfigurationStoreData.bugServicePropertiesMap);
            const needsSettingsContentProps = {
                deps,
                isOpen: this.state.showNeedsSettingsContent,
                selectedIssueFilingService,
                selectedIssueData: issueDetailsData,
                selectedIssueFilingServiceData,
                onClose: this.closeNeedsSettingsContent,
                issueFilingServicePropertiesMap: userConfigurationStoreData.bugServicePropertiesMap,
            };
            const NeedsSettingsContent = this.props.needsSettingsContentRenderer;
            return (React.createElement(React.Fragment, null,
                React.createElement(office_ui_fabric_react_1.DefaultButton, { className: 'file-issue-button', onClick: event => this.onClickFileIssueButton(event) },
                    React.createElement(lady_bug_solid_icon_1.LadyBugSolidIcon, null),
                    React.createElement("div", { className: "ms-Button-label" }, "File issue")),
                React.createElement(NeedsSettingsContent, Object.assign({}, needsSettingsContentProps))));
        }
        openNeedsSettingsContent() {
            this.setState({ showNeedsSettingsContent: true });
        }
    }
    exports.IssueFilingButton = IssueFilingButton;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/issue-filing-needs-settings-help-text.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueFilingNeedsSettingsHelpText = void 0;
    exports.IssueFilingNeedsSettingsHelpText = named_fc_1.NamedFC('IssueFilingNeedsSettingsHelpText', props => {
        if (props.isOpen) {
            return (React.createElement("div", { role: "alert", "aria-live": "polite", className: "file-issue-button-help" }, "Go to Settings to configure issue filing."));
        }
        return null;
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/new-tab-link.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("@uifabric/utilities"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, utilities_1, office_ui_fabric_react_1, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NewTabLink = void 0;
    exports.NewTabLink = named_fc_1.NamedFC('NewTabLink', (_a) => {
        var { className } = _a, props = __rest(_a, ["className"]);
        const classNames = ['insights-link', className];
        return React.createElement(office_ui_fabric_react_1.Link, Object.assign({ className: utilities_1.css(...classNames) }, props, { target: "_blank" }));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/null-component.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NullComponent = void 0;
    exports.NullComponent = named_fc_1.NamedFC('NullComponent', () => {
        return null;
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/components/toast.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"toastContainer":"toast-container--YaZxW","toastContent":"toast-content--Wt0Lj"};

/***/ }),

/***/ "./src/common/components/toast.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("@uifabric/utilities"), __webpack_require__("react"), __webpack_require__("./src/common/components/toast.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, utilities_1, React, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Toast = void 0;
    class Toast extends React.Component {
        constructor(props) {
            super(props);
            this.state = { toastVisible: false, content: null };
        }
        show(content) {
            var _a;
            this.setState({ toastVisible: true, content });
            this.timeoutId = this.props.deps.windowUtils.setTimeout(() => {
                this.setState({ toastVisible: false, content: null });
            }, (_a = this.props.timeoutLength) !== null && _a !== void 0 ? _a : Toast.defaultProps.timeoutLength);
        }
        componentWillUnmount() {
            if (this.timeoutId) {
                this.props.deps.windowUtils.clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
        }
        render() {
            return (React.createElement("div", { className: styles.toastContainer, "aria-live": "polite" }, this.state.toastVisible ? (React.createElement("div", { className: utilities_1.css('ms-fadeIn100', styles.toastContent) }, this.state.content)) : null));
        }
    }
    exports.Toast = Toast;
    Toast.defaultProps = {
        timeoutLength: 6000,
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/configs/unified-result-property-configurations.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/class-name-card-row.ts"), __webpack_require__("./src/common/components/cards/content-description-card-row.ts"), __webpack_require__("./src/common/components/cards/how-to-check-card-row.tsx"), __webpack_require__("./src/common/components/cards/text-card-row.ts"), __webpack_require__("./src/common/components/cards/how-to-fix-android-card-row.tsx"), __webpack_require__("./src/common/components/cards/how-to-fix-card-row.tsx"), __webpack_require__("./src/common/components/cards/path-card-row.tsx"), __webpack_require__("./src/common/components/cards/snippet-card-row.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, class_name_card_row_1, content_description_card_row_1, how_to_check_card_row_1, text_card_row_1, how_to_fix_android_card_row_1, how_to_fix_card_row_1, path_card_row_1, snippet_card_row_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getPropertyConfiguration = exports.textConfiguration = exports.contentDescriptionConfiguration = exports.classNameConfiguration = exports.snippetConfiguration = exports.cssSelectorConfiguration = exports.howToFixAndroidConfiguration = exports.howToCheckConfiguration = exports.howToFixConfiguration = exports.AllPropertyTypes = void 0;
    exports.AllPropertyTypes = [
        'css-selector',
        'how-to-fix-web',
        'how-to-check-web',
        'snippet',
        'className',
        'contentDescription',
        'text',
        'howToFixFormat',
    ];
    exports.howToFixConfiguration = {
        cardRow: how_to_fix_card_row_1.HowToFixWebCardRow,
    };
    exports.howToCheckConfiguration = {
        cardRow: how_to_check_card_row_1.HowToCheckWebCardRow,
    };
    exports.howToFixAndroidConfiguration = {
        cardRow: how_to_fix_android_card_row_1.HowToFixAndroidCardRow,
    };
    exports.cssSelectorConfiguration = {
        cardRow: path_card_row_1.PathCardRow,
    };
    exports.snippetConfiguration = {
        cardRow: snippet_card_row_1.SnippetCardRow,
    };
    exports.classNameConfiguration = {
        cardRow: class_name_card_row_1.ClassNameCardRow,
    };
    exports.contentDescriptionConfiguration = {
        cardRow: content_description_card_row_1.ContentDescriptionCardRow,
    };
    exports.textConfiguration = {
        cardRow: text_card_row_1.TextCardRow,
    };
    const propertyIdToConfigurationMap = {
        'css-selector': exports.cssSelectorConfiguration,
        'how-to-fix-web': exports.howToFixConfiguration,
        'how-to-check-web': exports.howToCheckConfiguration,
        howToFixFormat: exports.howToFixAndroidConfiguration,
        snippet: exports.snippetConfiguration,
        className: exports.classNameConfiguration,
        contentDescription: exports.contentDescriptionConfiguration,
        text: exports.textConfiguration,
    };
    function getPropertyConfiguration(id) {
        return propertyIdToConfigurationMap[id];
    }
    exports.getPropertyConfiguration = getPropertyConfiguration;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/constants/keycode-constants.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.KeyCodeConstants = void 0;
    // Copyright (c) Microsoft Corporation. All rights reserved.
    // Licensed under the MIT License.
    class KeyCodeConstants {
    }
    exports.KeyCodeConstants = KeyCodeConstants;
    KeyCodeConstants.TAB = 9;
    KeyCodeConstants.ENTER = 13;
    KeyCodeConstants.ALT = 18;
    KeyCodeConstants.SPACEBAR = 32;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/date-provider.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("moment")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, moment_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DateProvider = void 0;
    class DateProvider {
        static getDateFromTimestamp(timestamp) {
            if (DateProvider.isNumericalTimestamp(timestamp)) {
                return DateProvider.getDateFromMillis(timestamp);
            }
            else {
                return DateProvider.getDateFromDateString(timestamp);
            }
        }
        static getCurrentDate() {
            return new Date();
        }
        static getUTCStringFromDate(date) {
            return moment_1.utc(date.toISOString()).format('YYYY-MM-DD h:mm A z');
        }
        static getDateFromDateString(timestamp) {
            return new Date(timestamp);
        }
        static getDateFromMillis(timestamp) {
            return new Date(Number(timestamp));
        }
        static isNumericalTimestamp(timestamp) {
            return !isNaN(Number(timestamp));
        }
    }
    exports.DateProvider = DateProvider;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/fabric-icons.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("@uifabric/styling/lib/index")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, index_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initializeFabricIcons = void 0;
    function initializeFabricIcons() {
        index_1.registerIcons({
            style: {
                MozOsxFontSmoothing: 'grayscale',
                WebkitFontSmoothing: 'antialiased',
                fontStyle: 'normal',
                fontWeight: 'normal',
                speak: 'none',
            },
            fontFace: {
                fontFamily: 'FabricMDL2Icons',
            },
            icons: {
                add: '\uE710',
                back: '\uE72B',
                calculatorAddition: '\uE948',
                cancel: '\uE711',
                cat: '\uED7F',
                cellPhone: '\uE8EA',
                checkBox: '\uE739',
                checkMark: '\uE73E',
                chevronDown: '\uE70D',
                chevronDownMed: '\uE972',
                chevronRight: '\uE76C',
                chevronRightMed: '\uE974',
                chevronUp: '\uE70E',
                chromeClose: '\uE8BB',
                chromeMinimize: '\uE921',
                circleRing: '\uEA3A',
                completedSolid: '\uEC61',
                copy: '\uE8C8',
                contactCard: '\uEEBD',
                delete: '\uE74D',
                devices3: '\uEA6C',
                diagnostic: '\uE9D9',
                edit: '\uE70F',
                export: '\uEDE1',
                FabricFolder: '\uF0A9',
                feedback: '\uED15',
                fileHTML: '\uF2ED',
                gear: '\uE713',
                giftboxOpen: '\uF133',
                globalNavButton: '\uE700',
                hide2: '\uEF89',
                home: '\uE80F',
                incidentTriangle: '\uE814',
                info: '\uE946',
                keyboardClassic: '\uE765',
                ladybugSolid: '\uF44A',
                mail: '\uE715',
                medical: '\uEAD4',
                more: '\uE712',
                offlineStorage: '\uEC8C',
                play: '\uE768',
                refresh: '\uE72C',
                rocket: '\uF3B3',
                scopeTemplate: '\uF2B0',
                search: '\uE721',
                send: '\uE724',
                skypeCheck: '\uEF80',
                statusCircleCheckMark: '\uF13E',
                statusErrorFull: '\uEB90',
                stop: '\uE71A',
                tag: '\uE8EC',
                testBeaker: '\uF3A5',
                testBeakerSolid: '\uF3A6',
                textDocument: '\uF029',
                undo: '\uE7A7',
                unknown: '\uE9CE',
                view: '\uE890',
            },
        });
    }
    exports.initializeFabricIcons = initializeFabricIcons;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/feature-flag-defaults-helper.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FeatureFlagDefaultsHelper = void 0;
    class FeatureFlagDefaultsHelper {
        constructor(getFeatureFlagDetails) {
            this.getFeatureFlagDetails = getFeatureFlagDetails;
        }
        getDefaultFeatureFlagValues() {
            const details = this.getFeatureFlagDetails();
            const values = {};
            lodash_1.forEach(details, detail => {
                values[detail.id] = detail.defaultValue;
            });
            return values;
        }
        getForceDefaultFlags() {
            const details = this.getFeatureFlagDetails();
            const forceDefaultFlags = [];
            lodash_1.forEach(details, detail => {
                if (detail.forceDefault) {
                    forceDefaultFlags.push(detail.id);
                }
            });
            return forceDefaultFlags;
        }
    }
    exports.FeatureFlagDefaultsHelper = FeatureFlagDefaultsHelper;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/feature-flags.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/feature-flag-defaults-helper.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, feature_flag_defaults_helper_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getDefaultFeatureFlagsWeb = exports.getAllFeatureFlagDetails = exports.FeatureFlags = void 0;
    class FeatureFlags {
    }
    exports.FeatureFlags = FeatureFlags;
    FeatureFlags.logTelemetryToConsole = 'logTelemetryToConsole';
    FeatureFlags.showAllAssessments = 'showAllAssessments';
    FeatureFlags.shadowDialog = 'shadowDialog';
    FeatureFlags.showAllFeatureFlags = 'showAllFeatureFlags';
    FeatureFlags.scoping = 'scoping';
    FeatureFlags.showInstanceVisibility = 'showInstanceVisibility';
    FeatureFlags.manualInstanceDetails = 'manualInstanceDetails';
    FeatureFlags.debugTools = 'debugTools';
    FeatureFlags.exportReportOptions = 'exportReportOptions';
    FeatureFlags.needsReview = 'needsReview';
    function getAllFeatureFlagDetails() {
        return [
            {
                id: FeatureFlags.shadowDialog,
                defaultValue: false,
                displayableName: 'Improved dialog styling',
                displayableDescription: 'Avoids styling problems in failure dialogs by rendering them in shadow DOM. ' +
                    "(You'll need to refresh the target page to see the new dialog styling.)",
                isPreviewFeature: false,
                forceDefault: false,
            },
            {
                id: FeatureFlags.showAllAssessments,
                defaultValue: false,
                displayableName: 'Show all assessments',
                displayableDescription: 'Show all assessments, even the in-development ones',
                isPreviewFeature: false,
                forceDefault: false,
            },
            {
                id: FeatureFlags.logTelemetryToConsole,
                defaultValue: false,
                displayableName: 'Log telemetry to console',
                displayableDescription: 'Write telemetry payload information to the developer tools console.',
                isPreviewFeature: false,
                forceDefault: false,
            },
            {
                id: FeatureFlags.showAllFeatureFlags,
                defaultValue: false,
                displayableName: 'Show all feature flags',
                displayableDescription: 'Show all feature flags in the Preview Features panel.',
                isPreviewFeature: false,
                forceDefault: false,
            },
            {
                id: FeatureFlags.scoping,
                defaultValue: false,
                displayableName: 'Scoping experience',
                displayableDescription: 'Enable scoping to limit scanning to selected portions of the webpage.',
                isPreviewFeature: false,
                forceDefault: false,
            },
            {
                id: FeatureFlags.showInstanceVisibility,
                defaultValue: false,
                displayableName: 'Show instance visibility in assessment',
                displayableDescription: 'Shows visibility of instances in assessment requirement lists. May impact performance. ' +
                    "(You'll need to go to a different requirement and come back for it to take effect.)",
                isPreviewFeature: false,
                forceDefault: false,
            },
            {
                id: FeatureFlags.manualInstanceDetails,
                defaultValue: false,
                displayableName: 'Enable manual instance details',
                displayableDescription: 'Allow addition of path (CSS selector) which automatically ' +
                    'populates the corresponding code snippet when adding manual failure instance.',
                isPreviewFeature: false,
                forceDefault: false,
            },
            {
                id: FeatureFlags.debugTools,
                defaultValue: false,
                displayableName: 'Enable debug tools',
                displayableDescription: 'Click on the new icon close to the gear to open the debug tools',
                isPreviewFeature: false,
                forceDefault: false,
            },
            {
                id: FeatureFlags.exportReportOptions,
                defaultValue: false,
                displayableName: 'More export options',
                displayableDescription: 'Enables exporting reports to external services',
                isPreviewFeature: true,
                forceDefault: false,
            },
            {
                id: FeatureFlags.needsReview,
                defaultValue: false,
                displayableName: 'Needs review',
                displayableDescription: 'Enable a new test to show automated check rules that might have an accessibility issue and need to be reviewed.',
                isPreviewFeature: true,
                forceDefault: false,
            },
        ];
    }
    exports.getAllFeatureFlagDetails = getAllFeatureFlagDetails;
    function getDefaultFeatureFlagsWeb() {
        return new feature_flag_defaults_helper_1.FeatureFlagDefaultsHelper(getAllFeatureFlagDetails).getDefaultFeatureFlagValues();
    }
    exports.getDefaultFeatureFlagsWeb = getDefaultFeatureFlagsWeb;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/get-guidance-tags-from-guidance-links.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GetGuidanceTagsFromGuidanceLinks = void 0;
    exports.GetGuidanceTagsFromGuidanceLinks = links => {
        if (lodash_1.isArray(links) === false) {
            return [];
        }
        const tags = [];
        links.forEach(link => {
            if (lodash_1.isObject(link) === false || lodash_1.isArray(link.tags) === false) {
                return;
            }
            link.tags.forEach(tag => {
                tags.push(tag);
            });
        });
        return tags;
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/cancel-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CancelIcon = void 0;
    const d = 'M7.99121 7L14 13.0088L13.0088 14L7 7.99121L0.991211 14L0 13.0088L6.00879 7L0 0.991211L0.991211 0L7 6.00879L13.0088 0L14 ' +
        '0.991211L7.99121 7Z';
    exports.CancelIcon = named_fc_1.NamedFC('CancelIcon', () => (React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-hidden": "true" },
        React.createElement("path", { d: d, fill: "black", fillOpacity: "0.9" }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/check-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CheckIconInverted = exports.CheckIcon = void 0;
    exports.CheckIcon = named_fc_1.NamedFC('CheckIcon', () => (React.createElement("span", { className: "check-container" },
        React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
            React.createElement("circle", { cx: "8", cy: "8", r: "8", fill: "#228722" }),
            React.createElement("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M6.05904 11.1417L6.0616 11.1442C6.10737 11.19 6.15668 11.23 6.20867 11.2643C6.57256 11.5046 7.06707 11.4646 7.38742 11.1442C7.38861 11.143 7.38982 11.1418 7.391 11.1406L11.9312 6.60041C12.2974 6.23427 12.2974 5.64071 11.9312 5.27457C11.5651 4.90848 10.9715 4.90848 10.6054 5.27457L6.72452 9.15545L5.60041 8.03134C5.2343 7.66524 4.64071 7.66524 4.27459 8.03134C3.90847 8.39747 3.90847 8.99104 4.27459 9.35718L6.05904 11.1417Z", fill: "var(--neutral-0)" })))));
    exports.CheckIconInverted = named_fc_1.NamedFC('CheckIconInverted', () => (React.createElement("span", { className: "check-container" },
        React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
            React.createElement("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM6.0616 11.1442L6.05904 11.1417L4.27459 9.35718C3.90847 8.99104 3.90847 8.39747 4.27459 8.03134C4.64071 7.66524 5.2343 7.66524 5.60041 8.03134L6.72452 9.15545L10.6054 5.27457C10.9715 4.90848 11.5651 4.90848 11.9312 5.27457C12.2974 5.64071 12.2974 6.23427 11.9312 6.60041L7.391 11.1406L7.38742 11.1442C7.06707 11.4646 6.57256 11.5046 6.20867 11.2643C6.15668 11.23 6.10737 11.19 6.0616 11.1442Z", fill: "white" })))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/circle-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CircleIcon = void 0;
    exports.CircleIcon = named_fc_1.NamedFC('CircleIcon', () => React.createElement("span", { className: "check-container" }));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/comment-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CommentIcon = void 0;
    const d = 'M16 11.2891V0.289062H-7.62939e-06V11.2891H1.99999V15L5.71093 11.2891H16ZM1 1.28906H15L15 10.2891H5.28906L3 ' +
        '12.5781V10.2891H1V1.28906ZM9.99999 6.28906H8.99999V4.28906H11V6.28906C11 6.42969 10.974 6.55859 10.9219 6.67969C10.8698 6.80078 ' +
        '10.7982 6.90625 10.707 6.99609C10.6159 7.08594 10.5104 7.16016 10.3906 7.21094C10.2708 7.26172 10.1406 7.28906 9.99999 ' +
        '7.28906V6.28906ZM4.99999 6.28906H5.99999V7.28906C6.14062 7.28906 6.27083 7.26172 6.39062 7.21094C6.51041 7.16016 6.61588 ' +
        '7.08594 6.70702 6.99609C6.79817 6.90625 6.86978 6.80078 6.92187 6.67969C6.97395 6.55859 6.99999 6.42969 6.99999 ' +
        '6.28906V4.28906H4.99999V6.28906Z';
    exports.CommentIcon = named_fc_1.NamedFC('CommentIcon', () => (React.createElement("svg", { width: "17", height: "16", viewBox: "0 0 16 15", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
        React.createElement("path", { fillRule: "evenodd", clipRule: "evenodd", d: d, fill: "#737373" }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/copy-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CopyIcon = void 0;
    const d = 'M14 6.28906V16H4V13H0V0H6.71094L9.71094 3H10.7109L14 6.28906ZM11 6H12.2891L11 4.71094V6ZM4 3H8.28906L6.28906 1H1V12H4V3ZM13 ' +
        '7H10V4H5V15H13V7Z';
    exports.CopyIcon = named_fc_1.NamedFC('CopyIcon', () => (React.createElement("svg", { width: "14", height: "16", viewBox: "0 0 14 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-hidden": "true" },
        React.createElement("path", { d: d }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/cross-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CrossIconInverted = exports.CrossIcon = void 0;
    exports.CrossIcon = named_fc_1.NamedFC('CrossIcon', () => (React.createElement("span", { className: "check-container" },
        React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
            React.createElement("circle", { cx: "8", cy: "8", r: "8", fill: "#E81123" }),
            React.createElement("path", { d: "M10.9837 6.27639C11.3352 5.92491 11.3352 5.35507 10.9837 5.00359C10.6322 4.65212 10.0624 4.65212 9.7109 5.00359L7.99722 6.71728L6.28375 5.00381C5.93227 4.65234 5.36242 4.65234 5.01095 5.00381C4.65948 5.35528 4.65948 5.92513 5.01095 6.2766L6.72443 7.99007L4.9837 9.7308C4.63222 10.0823 4.63222 10.6521 4.9837 11.0036C5.33517 11.3551 5.90502 11.3551 6.25649 11.0036L7.99722 9.26287L9.73816 11.0038C10.0896 11.3553 10.6595 11.3553 11.011 11.0038C11.3624 10.6523 11.3624 10.0825 11.011 9.73101L9.27001 7.99007L10.9837 6.27639Z", fill: "var(--neutral-0)" })))));
    exports.CrossIconInverted = named_fc_1.NamedFC('CrossIconInverted', () => (React.createElement("span", { className: "check-container" },
        React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
            React.createElement("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 16C12.4183 16 16 12.4183 16 8C16 3.58173 12.4183 0 8 0C3.58172 0 0 3.58173 0 8C0 12.4183 3.58172 16 8 16ZM10.9947 4.99466C10.7018 4.70178 10.2269 4.70178 9.93401 4.99466L8 6.92868L6.06599 4.99466C5.77309 4.70178 5.29823 4.70178 5.00533 4.99466C4.71243 5.28757 4.71243 5.76242 5.00533 6.05533L6.93933 7.98932L4.99467 9.93399C4.70177 10.2269 4.70177 10.7018 4.99467 10.9947C5.28756 11.2876 5.76243 11.2876 6.05532 10.9947L8 9.04999L9.94467 10.9947C10.2376 11.2876 10.7124 11.2876 11.0053 10.9947C11.2982 10.7018 11.2982 10.2269 11.0053 9.93399L9.06066 7.98932L10.9947 6.05533C11.2876 5.76242 11.2876 5.28757 10.9947 4.99466Z", fill: "var(--neutral-0)" })))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/date-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DateIcon = void 0;
    const d = 'M8.82353 16C8.09697 16 7.39677 15.9062 6.72294 15.7188C6.05497 15.5312 5.42802 15.2676 4.84208 14.9277C4.26201 14.582 ' +
        '3.73173 14.1719 3.25126 13.6973C2.77665 13.2168 2.3665 12.6865 2.02079 12.1064C1.68095 11.5205 1.41728 10.8936 1.22978 ' +
        '10.2256C1.04228 9.55176 0.948529 8.85156 0.948529 8.125C0.948529 7.39844 1.04228 6.70117 1.22978 6.0332C1.41728 5.35937 ' +
        '1.68095 4.73242 2.02079 4.15234C2.3665 3.56641 2.77665 3.03613 3.25126 2.56152C3.73173 2.08105 4.26201 1.6709 4.84208 ' +
        '1.33105C5.42802 0.985352 6.05497 0.71875 6.72294 0.53125C7.39677 0.34375 8.09697 0.25 8.82353 0.25C9.55009 0.25 10.2474 ' +
        '0.34375 10.9153 0.53125C11.5892 0.71875 12.2161 0.985352 12.7962 1.33105C13.3821 1.6709 13.9124 2.08105 14.387 ' +
        '2.56152C14.8675 3.03613 15.2776 3.56641 15.6175 4.15234C15.9632 4.73242 16.2298 5.35937 16.4173 6.0332C16.6048 ' +
        '6.70117 16.6985 7.39844 16.6985 8.125C16.6985 8.85156 16.6048 9.55176 16.4173 10.2256C16.2298 10.8936 15.9632 11.5205 ' +
        '15.6175 12.1064C15.2776 12.6865 14.8675 13.2168 14.387 13.6973C13.9124 14.1719 13.3821 14.582 12.7962 14.9277C12.2161 15.2676 ' +
        '11.5892 15.5312 10.9153 15.7188C10.2474 15.9062 9.55009 16 8.82353 16ZM8.82353 1.375C7.89189 1.375 7.01591 1.55371 6.1956 ' +
        '1.91113C5.38115 2.2627 4.6663 2.74609 4.05107 3.36133C3.44169 3.9707 2.95829 4.68555 2.60087 5.50586C2.24931 6.32031 2.07353 ' +
        '7.19336 2.07353 8.125C2.07353 9.05664 2.24931 9.93262 2.60087 10.7529C2.95829 11.5674 3.44169 12.2822 4.05107 12.8975C4.6663 ' +
        '13.5068 5.38115 13.9902 6.1956 14.3477C7.01591 14.6992 7.89189 14.875 8.82353 14.875C9.75517 14.875 10.6282 14.6992 11.4427 ' +
        '14.3477C12.263 13.9902 12.9778 13.5068 13.5872 12.8975C14.2024 12.2822 14.6858 11.5674 15.0374 10.7529C15.3948 9.93262 ' +
        '15.5735 9.05664 15.5735 8.125C15.5735 7.19336 15.3948 6.32031 15.0374 5.50586C14.6858 4.68555 14.2024 3.9707 13.5872 ' +
        '3.36133C12.9778 2.74609 12.263 2.2627 11.4427 1.91113C10.6282 1.55371 9.75517 1.375 8.82353 1.375ZM8.82353 ' +
        '8.125V3.625H7.69853V9.25H12.1985V8.125H8.82353Z';
    exports.DateIcon = named_fc_1.NamedFC('DateIcon', () => (React.createElement("svg", { width: "17", height: "16", viewBox: "0 0 17 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
        React.createElement("path", { d: d, fill: "#737373" }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/file-html-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FileHTMLIcon = void 0;
    const d = 'M1 15H3V16H0V0H8.71094L12.7109 4H13V10H12V5H8V1H1V15ZM11.2891 4L9 1.71094V4H11.2891ZM5.85156 11.8516L4.20312 13.5L5.85156 ' +
        '15.1484L5.14844 15.8516L2.79688 13.5L5.14844 11.1484L5.85156 11.8516ZM8.5 12C8.70833 12 8.90365 12.0391 9.08594 12.1172C9.26823 ' +
        '12.1953 9.42708 12.3021 9.5625 12.4375C9.69792 12.5729 9.80469 12.7318 9.88281 12.9141C9.96094 13.0964 10 13.2917 10 13.5C10 ' +
        '13.7083 9.96094 13.9036 9.88281 14.0859C9.80469 14.2682 9.69792 14.4271 9.5625 14.5625C9.42708 14.6979 9.26823 14.8047 9.08594 ' +
        '14.8828C8.90365 14.9609 8.70833 15 8.5 15C8.29167 15 8.09635 14.9609 7.91406 14.8828C7.73177 14.8047 7.57292 14.6979 7.4375 ' +
        '14.5625C7.30208 14.4271 7.19531 14.2682 7.11719 14.0859C7.03906 13.9036 7 13.7083 7 13.5C7 13.2917 7.03906 13.0964 7.11719 ' +
        '12.9141C7.19531 12.7318 7.30208 12.5729 7.4375 12.4375C7.57292 12.3021 7.73177 12.1953 7.91406 12.1172C8.09635 12.0391 8.29167 12 ' +
        '8.5 12ZM14.2031 13.5L11.8516 15.8516L11.1484 15.1484L12.7969 13.5L11.1484 11.8516L11.8516 11.1484L14.2031 13.5Z';
    exports.FileHTMLIcon = named_fc_1.NamedFC('FileHTMLIcon', () => (React.createElement("svg", { width: "15", height: "16", viewBox: "0 0 15 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-hidden": "true" },
        React.createElement("path", { d: d }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/highlight-status-icons.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HighlightHiddenIcon = exports.HighlightUnavailableIcon = exports.HighlightVisibleIcon = void 0;
    exports.HighlightVisibleIcon = named_fc_1.NamedFC('HighlightVisibleIcon', () => (React.createElement("svg", { width: "34", height: "30", viewBox: "0 0 34 30", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-hidden": "true" },
        React.createElement("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M24.9247 15.2364C24.9252 15.2363 24.9228 15.2421 24.9161 15.2543C24.9209 15.2427 24.9242 15.2366 24.9247 15.2364ZM24.7382 15.5C24.6733 15.4225 24.5919 15.3323 24.4921 15.2312C24.1054 14.8394 23.5169 14.3566 22.767 13.8872C22.1349 13.4914 21.4077 13.1174 20.6127 12.8166C21.1701 13.5658 21.5 14.4944 21.5 15.5C21.5 16.5056 21.1701 17.4342 20.6127 18.1834C21.4077 17.8826 22.1349 17.5086 22.767 17.1128C23.5169 16.6434 24.1054 16.1606 24.4921 15.7688C24.5919 15.6677 24.6733 15.5775 24.7382 15.5ZM17 12.125H17C15.1361 12.125 13.6251 13.636 13.6251 15.5C13.6251 17.3639 15.1361 18.8749 17 18.8749C18.864 18.8749 20.375 17.3639 20.375 15.5C20.375 13.636 18.864 12.125 17 12.125ZM26 15.5C26 14.6562 21.9706 11 17 11C12.0294 11 8 14.6562 8 15.5C8 16.3438 12.0294 20 17 20C21.9706 20 26 16.3438 26 15.5ZM11.233 13.8872C11.8651 13.4914 12.5923 13.1174 13.3873 12.8165C12.8299 13.5658 12.5001 14.4944 12.5001 15.5C12.5001 16.5056 12.8299 17.4342 13.3874 18.1835C12.5924 17.8826 11.8652 17.5086 11.233 17.1128C10.4831 16.6434 9.8946 16.1606 9.50795 15.7688C9.40811 15.6677 9.32665 15.5775 9.26185 15.5C9.32665 15.4225 9.40811 15.3323 9.50795 15.2312C9.8946 14.8394 10.4831 14.3566 11.233 13.8872ZM9.07531 15.2364C9.07579 15.2366 9.07913 15.2427 9.08386 15.2543C9.07719 15.2421 9.07483 15.2363 9.07531 15.2364ZM9.07531 15.7636C9.07483 15.7637 9.07719 15.7579 9.08386 15.7457C9.07913 15.7573 9.07579 15.7634 9.07531 15.7636ZM24.9161 15.7457C24.9228 15.7579 24.9252 15.7637 24.9247 15.7636C24.9242 15.7634 24.9209 15.7573 24.9161 15.7457ZM17 16.625C17.6213 16.625 18.125 16.1213 18.125 15.5C18.125 14.8787 17.6213 14.375 17 14.375C16.3787 14.375 15.875 14.8787 15.875 15.5C15.875 16.1213 16.3787 16.625 17 16.625Z" }))));
    exports.HighlightUnavailableIcon = named_fc_1.NamedFC('HighlightUnavailableIcon', () => (React.createElement("svg", { width: "34", height: "30", viewBox: "0 0 34 30", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-hidden": "true" },
        React.createElement("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M26.0875 10.3814C25.9321 10.1124 25.5881 10.0202 25.3191 10.1756L8.36661 19.9631C8.09757 20.1184 8.00539 20.4624 8.16072 20.7314C8.31605 21.0005 8.66007 21.0927 8.92911 20.9373L12.3384 18.969C13.6981 19.5691 15.2936 20 17 20C21.9706 20 26 16.3437 26 15.5C26 15.0546 24.8771 13.8254 23.0856 12.7641L25.8816 11.1498C26.1506 10.9945 26.2428 10.6505 26.0875 10.3814ZM21.9513 13.419L21.191 13.8579C21.3905 14.3666 21.5 14.9205 21.5 15.5C21.5 16.5056 21.1701 17.4342 20.6127 18.1834C21.4077 17.8826 22.1349 17.5086 22.767 17.1128C23.5169 16.6434 24.1054 16.1605 24.4921 15.7688C24.5919 15.6677 24.6733 15.5775 24.7382 15.5C24.6733 15.4225 24.5919 15.3323 24.4921 15.2312C24.1054 14.8394 23.5169 14.3566 22.767 13.8872C22.5102 13.7264 22.2376 13.5692 21.9513 13.419ZM20.2016 14.4292L18.1172 15.6326C18.0516 16.1914 17.5764 16.625 17 16.625C16.8423 16.625 16.6922 16.5925 16.556 16.534L14.4727 17.7368C15.091 18.4349 15.9941 18.8749 17 18.8749C18.864 18.8749 20.375 17.3639 20.375 15.5C20.375 15.1257 20.3141 14.7656 20.2016 14.4292ZM17 11C18.3092 11 19.5531 11.2536 20.6753 11.6427L18.866 12.6873C18.3315 12.332 17.6899 12.125 17 12.125C15.1361 12.125 13.6251 13.636 13.6251 15.5C13.6251 15.5703 13.6272 15.6402 13.6315 15.7095L12.5745 16.3197C12.5256 16.0539 12.5001 15.7799 12.5001 15.5C12.5001 14.4943 12.8299 13.5658 13.3873 12.8165C12.5923 13.1174 11.8651 13.4914 11.233 13.8872C10.4831 14.3566 9.8946 14.8394 9.50795 15.2312C9.40811 15.3323 9.32665 15.4224 9.26185 15.5C9.32665 15.5775 9.40811 15.6677 9.50795 15.7688C9.89194 16.1579 10.475 16.6368 11.2175 17.1031L10.1285 17.7319C8.80067 16.8111 8 15.8761 8 15.5C8 14.6562 12.0294 11 17 11ZM24.9247 15.2364C24.9252 15.2363 24.9228 15.2421 24.9161 15.2543C24.9209 15.2427 24.9242 15.2366 24.9247 15.2364ZM9.07531 15.2364C9.07579 15.2366 9.07913 15.2427 9.08386 15.2543C9.07719 15.2421 9.07483 15.2363 9.07531 15.2364ZM9.07531 15.7636C9.07483 15.7637 9.07719 15.7579 9.08386 15.7457C9.07913 15.7573 9.07579 15.7634 9.07531 15.7636ZM24.9161 15.7456C24.9228 15.7579 24.9252 15.7637 24.9247 15.7636C24.9242 15.7634 24.9209 15.7573 24.9161 15.7456Z" }))));
    exports.HighlightHiddenIcon = named_fc_1.NamedFC('HighlightHiddenIcon', () => (React.createElement("svg", { width: "34", height: "30", viewBox: "0 0 34 30", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-hidden": "true" },
        React.createElement("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M9.08085 15C9.37419 15 9.61642 15.2189 9.65314 15.5022C9.66291 15.5202 9.68058 15.5492 9.70996 15.5894C9.78757 15.6956 9.91672 15.8391 10.1028 16.0101C10.4726 16.3502 11.0242 16.7595 11.7188 17.1541C13.1101 17.9445 15.0205 18.6451 17.1142 18.6451C19.2079 18.6451 21.1184 17.9445 22.5096 17.1541C23.2043 16.7595 23.7559 16.3502 24.1257 16.0101C24.3117 15.8391 24.4409 15.6956 24.5185 15.5894C24.5479 15.5492 24.5655 15.5202 24.5753 15.5022C24.612 15.2189 24.8542 15 25.1476 15C25.2415 15 25.3302 15.0224 25.4086 15.0622C25.4284 15.0708 25.4481 15.0805 25.4674 15.0913L28.8484 16.9905C29.1323 17.1499 29.2394 17.4999 29.0877 17.7723C28.9361 18.0447 28.583 18.1363 28.2992 17.9769L25.3938 16.3449C25.2642 16.5099 25.0983 16.6838 24.9069 16.8598C24.4637 17.2673 23.8388 17.7265 23.0797 18.1577C22.8753 18.2739 22.6601 18.3885 22.4351 18.5L24.1304 21.1648C24.2973 21.4271 24.2088 21.7809 23.9328 21.9549C23.6567 22.129 23.2976 22.0574 23.1307 21.7951L21.3406 18.9814C20.2653 19.3968 19.0358 19.7076 17.7186 19.7821V22.8381C17.7186 23.141 17.448 23.3865 17.1142 23.3865C16.7804 23.3865 16.5098 23.141 16.5098 22.8381L16.5098 19.7821C15.1926 19.7075 13.9631 19.3968 12.8878 18.9814L11.0976 21.7951C10.9307 22.0574 10.5717 22.129 10.2956 21.9549C10.0195 21.7809 9.93105 21.4271 10.0979 21.1648L11.7933 18.5C11.5683 18.3885 11.3531 18.2739 11.1487 18.1577C10.3896 17.7265 9.76474 17.2673 9.32154 16.8598C9.11716 16.6719 8.94198 16.4864 8.80883 16.3116L5.85741 17.9694C5.57358 18.1289 5.22055 18.0373 5.06888 17.7649C4.91722 17.4925 5.02436 17.1424 5.30818 16.983L8.68923 15.0838C8.78815 15.0283 8.89546 15.0032 8.99974 15.0057C9.02624 15.0019 9.05332 15 9.08085 15ZM9.64501 15.486C9.64391 15.4835 9.64348 15.4823 9.64355 15.4823C9.64361 15.4823 9.64416 15.4836 9.64501 15.486Z" }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/inapplicable-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InapplicableIconInverted = exports.InapplicableIcon = void 0;
    exports.InapplicableIcon = named_fc_1.NamedFC('InapplicableIcon', () => (React.createElement("span", { className: "check-container" },
        React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
            React.createElement("circle", { cx: "8", cy: "8", r: "8", fill: "#737373" }),
            React.createElement("line", { x1: "5.66064", y1: "5.625", x2: "10.2568", y2: "10.2212", stroke: "white", strokeWidth: "1.5", strokeLinecap: "round" })))));
    exports.InapplicableIconInverted = named_fc_1.NamedFC('InapplicableIconInverted', () => (React.createElement("span", { className: "check-container" },
        React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
            React.createElement("circle", { cx: "8", cy: "8", r: "8", fill: "white" }),
            React.createElement("line", { x1: "5.66064", y1: "5.625", x2: "10.2568", y2: "10.2212", stroke: "#737373", strokeWidth: "1.5", strokeLinecap: "round" })))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/lady-bug-solid-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LadyBugSolidIcon = void 0;
    const d = 'M6 4.5C6.53125 4.5 7.04167 4.57031 7.53125 4.71094C8.02083 4.84635 8.47656 5.03906 8.89844 5.28906C9.32552 5.53385 9.71354 5.83333 ' +
        '10.0625 6.1875C10.4167 6.53646 10.7161 6.92448 10.9609 7.35156C11.2109 7.77344 11.4036 8.22917 11.5391 8.71875C11.6797 9.20833 ' +
        '11.75 9.71875 11.75 10.25C11.75 10.8333 11.6641 11.3958 11.4922 11.9375C11.3255 12.4792 11.0859 12.9818 10.7734 13.4453C10.4661 ' +
        '13.9089 10.0911 14.3229 9.64844 14.6875C9.21094 15.0521 8.72396 15.3438 8.1875 15.5625L7.84375 14.5312C7.55729 14.6823 7.25781 ' +
        '14.7995 6.94531 14.8828C6.63802 14.9609 6.32292 15 6 15C5.67708 15 5.35938 14.9609 5.04688 14.8828C4.73958 14.7995 4.44271 14.6823 ' +
        '4.15625 14.5312L3.8125 15.5625C3.27083 15.3438 2.78125 15.0521 2.34375 14.6875C1.90625 14.3229 1.53125 13.9089 1.21875 ' +
        '13.4453C0.911458 12.9818 0.671875 12.4792 0.5 11.9375C0.333333 11.3958 0.25 10.8333 0.25 10.25C0.25 9.71875 0.317708 9.20833 ' +
        '0.453125 8.71875C0.59375 8.22917 0.786458 7.77344 1.03125 7.35156C1.28125 6.92448 1.58073 6.53646 1.92969 6.1875C2.28385 5.83333 ' +
        '2.67188 5.53385 3.09375 5.28906C3.52083 5.03906 3.97917 4.84635 4.46875 4.71094C4.95833 4.57031 5.46875 4.5 6 4.5ZM3 12C3.14062 ' +
        '12 3.27083 11.974 3.39062 11.9219C3.51042 11.8698 3.61458 11.7995 3.70312 11.7109C3.79688 11.6172 3.86979 11.5104 3.92188 ' +
        '11.3906C3.97396 11.2708 4 11.1406 4 11C4 10.8594 3.97396 10.7292 3.92188 10.6094C3.86979 10.4896 3.79688 10.3854 3.70312 ' +
        '10.2969C3.61458 10.2031 3.51042 10.1302 3.39062 10.0781C3.27083 10.026 3.14062 10 3 10C2.85938 10 2.72917 10.026 2.60938 ' +
        '10.0781C2.48958 10.1302 2.38281 10.2031 2.28906 10.2969C2.20052 10.3854 2.13021 10.4896 2.07812 10.6094C2.02604 10.7292 2 10.8594 ' +
        '2 11C2 11.1406 2.02604 11.2708 2.07812 11.3906C2.13021 11.5104 2.20052 11.6172 2.28906 11.7109C2.38281 11.7995 2.48958 11.8698 ' +
        '2.60938 11.9219C2.72917 11.974 2.85938 12 3 12ZM4 9C4.14062 9 4.27083 8.97396 4.39062 8.92188C4.51042 8.86979 4.61458 8.79948 ' +
        '4.70312 8.71094C4.79688 8.61719 4.86979 8.51042 4.92188 8.39062C4.97396 8.27083 5 8.14062 5 8C5 7.85938 4.97396 7.72917 4.92188 ' +
        '7.60938C4.86979 7.48958 4.79688 7.38542 4.70312 7.29688C4.61458 7.20312 4.51042 7.13021 4.39062 7.07812C4.27083 7.02604 4.14062 7 4 ' +
        '7C3.85938 7 3.72917 7.02604 3.60938 7.07812C3.48958 7.13021 3.38281 7.20312 3.28906 7.29688C3.20052 7.38542 3.13021 7.48958 3.07812 ' +
        '7.60938C3.02604 7.72917 3 7.85938 3 8C3 8.14062 3.02604 8.27083 3.07812 8.39062C3.13021 8.51042 3.20052 8.61719 3.28906 ' +
        '8.71094C3.38281 8.79948 3.48958 8.86979 3.60938 8.92188C3.72917 8.97396 3.85938 9 4 9ZM6 14C6.27083 14 6.53385 13.9635 6.78906 ' +
        '13.8906C7.04427 13.8125 7.28906 13.7057 7.52344 13.5703L6 9L4.47656 13.5703C4.71094 13.7057 4.95573 13.8125 5.21094 13.8906C5.46615 ' +
        '13.9635 5.72917 14 6 14ZM7 8C7 8.14062 7.02604 8.27083 7.07812 8.39062C7.13021 8.51042 7.20052 8.61719 7.28906 8.71094C7.38281 ' +
        '8.79948 7.48958 8.86979 7.60938 8.92188C7.72917 8.97396 7.85938 9 8 9C8.14062 9 8.27083 8.97396 8.39062 8.92188C8.51042 8.86979 ' +
        '8.61458 8.79948 8.70312 8.71094C8.79688 8.61719 8.86979 8.51042 8.92188 8.39062C8.97396 8.27083 9 8.14062 9 8C9 7.85938 8.97396 ' +
        '7.72917 8.92188 7.60938C8.86979 7.48958 8.79688 7.38542 8.70312 7.29688C8.61458 7.20312 8.51042 7.13021 8.39062 7.07812C8.27083 ' +
        '7.02604 8.14062 7 8 7C7.85938 7 7.72917 7.02604 7.60938 7.07812C7.48958 7.13021 7.38281 7.20312 7.28906 7.29688C7.20052 7.38542 ' +
        '7.13021 7.48958 7.07812 7.60938C7.02604 7.72917 7 7.85938 7 8ZM9 12C9.14062 12 9.27083 11.974 9.39062 11.9219C9.51042 11.8698 ' +
        '9.61458 11.7995 9.70312 11.7109C9.79688 11.6172 9.86979 11.5104 9.92188 11.3906C9.97396 11.2708 10 11.1406 10 11C10 10.8594 9.97396 ' +
        '10.7292 9.92188 10.6094C9.86979 10.4896 9.79688 10.3854 9.70312 10.2969C9.61458 10.2031 9.51042 10.1302 9.39062 10.0781C9.27083 ' +
        '10.026 9.14062 10 9 10C8.85938 10 8.72917 10.026 8.60938 10.0781C8.48958 10.1302 8.38281 10.2031 8.28906 10.2969C8.20052 10.3854 ' +
        '8.13021 10.4896 8.07812 10.6094C8.02604 10.7292 8 10.8594 8 11C8 11.1406 8.02604 11.2708 8.07812 11.3906C8.13021 11.5104 8.20052 ' +
        '11.6172 8.28906 11.7109C8.38281 11.7995 8.48958 11.8698 8.60938 11.9219C8.72917 11.974 8.85938 12 9 12ZM3.5 3.5C3.5 3.125 3.57812 ' +
        '2.77344 3.73438 2.44531L2.64844 1.35156L3.35156 0.648438L4.33594 1.63281C4.57031 1.42969 4.82812 1.27344 5.10938 1.16406C5.39062 ' +
        '1.05469 5.6875 1 6 1C6.3125 1 6.60938 1.05469 6.89062 1.16406C7.17188 1.27344 7.42969 1.42969 7.66406 1.63281L8.64844 ' +
        '0.648438L9.35156 1.35156L8.26562 2.44531C8.42188 2.77344 8.5 3.125 8.5 3.5C8.5 3.56771 8.49479 3.63542 8.48438 3.70312C8.47917 ' +
        '3.76562 8.47135 3.82812 8.46094 3.89062C8.07031 3.72396 7.66667 3.59635 7.25 3.50781C6.83854 3.41927 6.42188 3.375 6 3.375C5.57812 ' +
        '3.375 5.15885 3.41927 4.74219 3.50781C4.33073 3.59635 3.92969 3.72396 3.53906 3.89062C3.52865 3.82812 3.51823 3.76562 3.50781 ' +
        '3.70312C3.5026 3.63542 3.5 3.56771 3.5 3.5Z';
    exports.LadyBugSolidIcon = named_fc_1.NamedFC('LadyBugSolidIcon', () => (React.createElement("svg", { width: "12", height: "16", viewBox: "0 0 12 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-hidden": "true" },
        React.createElement("path", { d: d }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/more-actions-menu-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MoreActionsMenuIcon = void 0;
    exports.MoreActionsMenuIcon = named_fc_1.NamedFC('MoreActionsMenuIcon', () => (React.createElement("svg", { width: "10", height: "16", viewBox: "0 0 10 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-hidden": "true" },
        React.createElement("circle", { cx: "5", cy: "14", r: "1.5" }),
        React.createElement("circle", { cx: "5", cy: "8", r: "1.5" }),
        React.createElement("circle", { cx: "5", cy: "2", r: "1.5" }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/icons/url-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UrlIcon = void 0;
    const d = 'M8.82353 0C9.5579 0 10.2662 0.0963542 10.9485 0.289062C11.6308 0.476562 12.2688 0.744792 12.8626 1.09375C13.4563 1.4375 ' +
        '13.9954 1.85417 14.4798 2.34375C14.9694 2.82812 15.386 3.36719 15.7298 3.96094C16.0787 4.55469 16.347 5.19271 16.5345 5.875C16.7272 ' +
        '6.55729 16.8235 7.26562 16.8235 8C16.8235 8.73438 16.7272 9.44271 16.5345 10.125C16.347 10.8073 16.0787 11.4453 15.7298 ' +
        '12.0391C15.386 12.6328 14.9694 13.1745 14.4798 13.6641C13.9954 14.1484 13.4563 14.5651 12.8626 14.9141C12.2688 15.2578 11.6308 ' +
        '15.526 10.9485 15.7188C10.2662 15.9062 9.5579 16 8.82353 16C8.08915 16 7.38082 15.9062 6.69853 15.7188C6.01624 15.526 5.37822 ' +
        '15.2578 4.78447 14.9141C4.19072 14.5651 3.64905 14.1484 3.15947 13.6641C2.67509 13.1745 2.25843 12.6328 1.90947 12.0391C1.56572 ' +
        '11.4453 1.29749 10.8099 1.10478 10.1328C0.917279 9.45052 0.823529 8.73958 0.823529 8C0.823529 7.26562 0.917279 6.55729 1.10478 ' +
        '5.875C1.29749 5.19271 1.56572 4.55469 1.90947 3.96094C2.25843 3.36719 2.67509 2.82812 3.15947 2.34375C3.64905 1.85417 4.19072 ' +
        '1.4375 4.78447 1.09375C5.37822 0.744792 6.01363 0.476562 6.69072 0.289062C7.37301 0.0963542 8.08395 0 8.82353 0ZM15.1438 5C14.9459 ' +
        '4.57812 14.7063 4.18229 14.4251 3.8125C14.1438 3.4375 13.8313 3.09635 13.4876 2.78906C13.1438 2.48177 12.7714 2.20833 12.3704 ' +
        '1.96875C11.9694 1.72917 11.5501 1.53385 11.1126 1.38281C11.3001 1.64323 11.4694 1.91927 11.6204 2.21094C11.7714 2.5026 11.9043 ' +
        '2.80469 12.0188 3.11719C12.1386 3.42448 12.2402 3.73698 12.3235 4.05469C12.4069 4.3724 12.4798 4.6875 12.5423 5H15.1438ZM15.8235 ' +
        '8C15.8235 7.30729 15.7272 6.64062 15.5345 6H12.6985C12.7402 6.33333 12.7714 6.66667 12.7923 7C12.8131 7.32812 12.8235 7.66146 ' +
        '12.8235 8C12.8235 8.33854 12.8131 8.67448 12.7923 9.00781C12.7714 9.33594 12.7402 9.66667 12.6985 10H15.5345C15.7272 9.35938 ' +
        '15.8235 8.69271 15.8235 8ZM8.82353 15C9.07874 15 9.31572 14.9297 9.53447 14.7891C9.75843 14.6484 9.96415 14.4635 10.1517 ' +
        '14.2344C10.3392 14.0052 10.5058 13.7474 10.6517 13.4609C10.8027 13.1693 10.9355 12.875 11.0501 12.5781C11.1647 12.2812 11.261 ' +
        '11.9948 11.3392 11.7188C11.4173 11.4427 11.4772 11.2031 11.5188 11H6.12822C6.16988 11.2031 6.22978 11.4427 6.3079 11.7188C6.38603 ' +
        '11.9948 6.48238 12.2812 6.59697 12.5781C6.71155 12.875 6.84176 13.1693 6.98759 13.4609C7.13863 13.7474 7.3079 14.0052 7.4954 ' +
        '14.2344C7.6829 14.4635 7.88603 14.6484 8.10478 14.7891C8.32874 14.9297 8.56832 15 8.82353 15ZM11.6907 10C11.7324 9.66667 11.7636 ' +
        '9.33594 11.7845 9.00781C11.8105 8.67448 11.8235 8.33854 11.8235 8C11.8235 7.66146 11.8105 7.32812 11.7845 7C11.7636 6.66667 ' +
        '11.7324 6.33333 11.6907 6H5.95634C5.91468 6.33333 5.88082 6.66667 5.85478 7C5.83395 7.32812 5.82353 7.66146 5.82353 8C5.82353 ' +
        '8.33854 5.83395 8.67448 5.85478 9.00781C5.88082 9.33594 5.91468 9.66667 5.95634 10H11.6907ZM1.82353 8C1.82353 8.69271 1.91988 ' +
        '9.35938 2.11259 10H4.94853C4.90686 9.66667 4.87561 9.33594 4.85478 9.00781C4.83395 8.67448 4.82353 8.33854 4.82353 8C4.82353 ' +
        '7.66146 4.83395 7.32812 4.85478 7C4.87561 6.66667 4.90686 6.33333 4.94853 6H2.11259C1.91988 6.64062 1.82353 7.30729 1.82353 ' +
        '8ZM8.82353 1C8.56832 1 8.32874 1.07031 8.10478 1.21094C7.88603 1.35156 7.6829 1.53646 7.4954 1.76562C7.3079 1.99479 7.13863 ' +
        '2.25521 6.98759 2.54688C6.84176 2.83333 6.71155 3.125 6.59697 3.42188C6.48238 3.71875 6.38603 4.00521 6.3079 4.28125C6.22978 ' +
        '4.55729 6.16988 4.79688 6.12822 5H11.5188C11.4772 4.79688 11.4173 4.55729 11.3392 4.28125C11.261 4.00521 11.1647 3.71875 11.0501 ' +
        '3.42188C10.9355 3.125 10.8027 2.83333 10.6517 2.54688C10.5058 2.25521 10.3392 1.99479 10.1517 1.76562C9.96415 1.53646 9.75843 ' +
        '1.35156 9.53447 1.21094C9.31572 1.07031 9.07874 1 8.82353 1ZM6.53447 1.38281C6.09697 1.53385 5.6777 1.72917 5.27665 ' +
        '1.96875C4.87561 2.20833 4.50322 2.48177 4.15947 2.78906C3.81572 3.09635 3.50322 3.4375 3.22197 3.8125C2.94072 4.18229 ' +
        '2.70113 4.57812 2.50322 5H5.10478C5.16728 4.6875 5.2402 4.3724 5.32353 4.05469C5.40686 3.73698 5.50582 3.42448 5.6204 ' +
        '3.11719C5.7402 2.80469 5.87561 2.5026 6.02665 2.21094C6.1777 1.91927 6.34697 1.64323 6.53447 1.38281ZM2.50322 11C2.70113 ' +
        '11.4219 2.94072 11.8203 3.22197 12.1953C3.50322 12.5651 3.81572 12.9036 4.15947 13.2109C4.50322 13.5182 4.87561 13.7917 5.27665 ' +
        '14.0312C5.6777 14.2708 6.09697 14.4661 6.53447 14.6172C6.34697 14.3568 6.1777 14.0807 6.02665 13.7891C5.87561 13.4974 5.7402 ' +
        '13.1979 5.6204 12.8906C5.50582 12.5781 5.40686 12.263 5.32353 11.9453C5.2402 11.6276 5.16728 11.3125 5.10478 11H2.50322ZM11.1126 ' +
        '14.6172C11.5501 14.4661 11.9694 14.2708 12.3704 14.0312C12.7714 13.7917 13.1438 13.5182 13.4876 13.2109C13.8313 12.9036 14.1438 ' +
        '12.5651 14.4251 12.1953C14.7063 11.8203 14.9459 11.4219 15.1438 11H12.5423C12.4798 11.3125 12.4069 11.6276 12.3235 ' +
        '11.9453C12.2402 12.263 12.1386 12.5781 12.0188 12.8906C11.9043 13.1979 11.7714 13.4974 11.6204 13.7891C11.4694 14.0807 11.3001 ' +
        '14.3568 11.1126 14.6172Z';
    exports.UrlIcon = named_fc_1.NamedFC('UrlIcon', () => (React.createElement("svg", { width: "17", height: "16", viewBox: "0 0 17 16", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
        React.createElement("path", { d: d, fill: "#737373" }))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/react/named-fc.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NamedFC = void 0;
    function NamedFC(displayName, component) {
        component.displayName = displayName;
        return component;
    }
    exports.NamedFC = NamedFC;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/rule-based-view-model-provider.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash"), __webpack_require__("./src/common/types/store-data/card-view-model.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1, card_view_model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getCardViewData = void 0;
    exports.getCardViewData = (rules, results, cardSelectionViewData) => {
        if (results == null || rules == null || cardSelectionViewData == null) {
            return null;
        }
        const statusResults = getEmptyStatusResults();
        const ruleIdsWithResultNodes = new Set();
        for (const result of results) {
            const ruleResults = statusResults[result.status];
            const isInstanceDisplayed = result.status === 'fail' || result.status === 'unknown';
            let ruleResult = getExistingRuleFromResults(result.ruleId, ruleResults);
            if (!ruleResult) {
                const rule = getUnifiedRule(result.ruleId, rules);
                if (!rule) {
                    continue;
                }
                const isExpanded = isInstanceDisplayed
                    ? lodash_1.includes(cardSelectionViewData.expandedRuleIds, rule.id)
                    : false;
                ruleResult = createCardRuleResult(result.status, rule, isExpanded);
                ruleResults.push(ruleResult);
            }
            const isSelected = isInstanceDisplayed
                ? lodash_1.includes(cardSelectionViewData.selectedResultUids, result.uid)
                : false;
            const highlightStatus = cardSelectionViewData.resultsHighlightStatus[result.uid];
            ruleResult.nodes.push(createCardResult(result, isSelected, highlightStatus));
            ruleIdsWithResultNodes.add(result.ruleId);
        }
        for (const rule of rules) {
            if (!ruleIdsWithResultNodes.has(rule.id)) {
                statusResults.inapplicable.push(createRuleResultWithoutNodes('inapplicable', rule));
            }
        }
        return {
            cards: statusResults,
            visualHelperEnabled: cardSelectionViewData.visualHelperEnabled,
            allCardsCollapsed: cardSelectionViewData.expandedRuleIds.length === 0,
        };
    };
    const getExistingRuleFromResults = (ruleId, ruleResults) => {
        const ruleResultIndex = getRuleResultIndex(ruleId, ruleResults);
        return ruleResultIndex !== -1 ? ruleResults[ruleResultIndex] : null;
    };
    const getEmptyStatusResults = () => {
        const statusResults = {};
        card_view_model_1.AllRuleResultStatuses.forEach(status => {
            statusResults[status] = [];
        });
        return statusResults;
    };
    const createCardRuleResult = (status, rule, isExpanded) => ({
        id: rule.id,
        status: status,
        nodes: [],
        description: rule.description,
        url: rule.url,
        guidance: rule.guidance,
        isExpanded: isExpanded,
    });
    const createRuleResultWithoutNodes = (status, rule) => ({
        id: rule.id,
        status: status,
        nodes: [],
        description: rule.description,
        url: rule.url,
        guidance: rule.guidance,
        isExpanded: false,
    });
    const createCardResult = (unifiedResult, isSelected, highlightStatus) => {
        return Object.assign(Object.assign({}, unifiedResult), { isSelected,
            highlightStatus });
    };
    const getUnifiedRule = (id, rules) => rules.find(rule => rule.id === id);
    const getRuleResultIndex = (ruleId, ruleResults) => ruleResults.findIndex(result => result.id === ruleId);
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/types/store-data/card-view-model.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AllRuleResultStatuses = void 0;
    exports.AllRuleResultStatuses = [
        'pass',
        'fail',
        'unknown',
        'inapplicable',
    ];
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/common/uid-generator.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("uuid")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, uuid_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.generateUID = void 0;
    exports.generateUID = uuid_1.v4;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/content/guidance-tags.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.guidanceTags = void 0;
    exports.guidanceTags = {
        WCAG_2_1: {
            id: 'WCAG_2_1',
            displayText: 'New for WCAG 2.1',
        },
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/content/link.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/views/content/content-page.tsx"), __webpack_require__("./src/content/guidance-tags.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, content_page_1, guidance_tags_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.link = void 0;
    exports.link = {
        WCAG_1_1_1: content_page_1.guidanceLinkTo('WCAG 1.1.1', 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'),
        WCAG_1_2_1: content_page_1.guidanceLinkTo('WCAG 1.2.1', 'https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded'),
        WCAG_1_2_2: content_page_1.guidanceLinkTo('WCAG 1.2.2', 'https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html'),
        WCAG_1_2_4: content_page_1.guidanceLinkTo('WCAG 1.2.4', 'https://www.w3.org/WAI/WCAG21/Understanding/captions-live.html'),
        WCAG_1_2_5: content_page_1.guidanceLinkTo('WCAG 1.2.5', 'https://www.w3.org/WAI/WCAG21/Understanding/audio-description-prerecorded'),
        WCAG_1_3_1: content_page_1.guidanceLinkTo('WCAG 1.3.1', 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships'),
        WCAG_1_3_2: content_page_1.guidanceLinkTo('WCAG 1.3.2', 'https://www.w3.org/WAI/WCAG21/Understanding/meaningful-sequence.html'),
        WCAG_1_3_3: content_page_1.guidanceLinkTo('WCAG 1.3.3', 'https://www.w3.org/WAI/WCAG21/Understanding/sensory-characteristics.html'),
        WCAG_1_3_4: content_page_1.guidanceLinkTo('WCAG 1.3.4', 'https://www.w3.org/WAI/WCAG21/Understanding/orientation.html', [guidance_tags_1.guidanceTags.WCAG_2_1]),
        WCAG_1_3_5: content_page_1.guidanceLinkTo('WCAG 1.3.5', 'https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose.html', [
            guidance_tags_1.guidanceTags.WCAG_2_1,
        ]),
        WCAG_1_4_1: content_page_1.guidanceLinkTo('WCAG 1.4.1', 'https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html'),
        WCAG_1_4_2: content_page_1.guidanceLinkTo('WCAG 1.4.2', 'https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html'),
        WCAG_1_4_3: content_page_1.guidanceLinkTo('WCAG 1.4.3', 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html'),
        WCAG_1_4_4: content_page_1.guidanceLinkTo('WCAG 1.4.4', 'https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html'),
        WCAG_1_4_5: content_page_1.guidanceLinkTo('WCAG 1.4.5', 'https://www.w3.org/WAI/WCAG21/Understanding/images-of-text.html'),
        WCAG_1_4_10: content_page_1.guidanceLinkTo('WCAG 1.4.10', 'https://www.w3.org/WAI/WCAG21/Understanding/reflow.html', [guidance_tags_1.guidanceTags.WCAG_2_1]),
        WCAG_1_4_11: content_page_1.guidanceLinkTo('WCAG 1.4.11', 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html', [
            guidance_tags_1.guidanceTags.WCAG_2_1,
        ]),
        WCAG_1_4_12: content_page_1.guidanceLinkTo('WCAG 1.4.12', 'https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html', [guidance_tags_1.guidanceTags.WCAG_2_1]),
        WCAG_1_4_13: content_page_1.guidanceLinkTo('WCAG 1.4.13', 'https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html', [
            guidance_tags_1.guidanceTags.WCAG_2_1,
        ]),
        WCAG_2_1_1: content_page_1.guidanceLinkTo('WCAG 2.1.1', 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html'),
        WCAG_2_1_2: content_page_1.guidanceLinkTo('WCAG 2.1.2', 'https://www.w3.org/WAI/WCAG21/Understanding/no-keyboard-trap.html'),
        WCAG_2_1_4: content_page_1.guidanceLinkTo('WCAG 2.1.4', 'https://www.w3.org/WAI/WCAG21/Understanding/character-key-shortcuts.html', [
            guidance_tags_1.guidanceTags.WCAG_2_1,
        ]),
        WCAG_2_2_1: content_page_1.guidanceLinkTo('WCAG 2.2.1', 'https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html'),
        WCAG_2_2_2: content_page_1.guidanceLinkTo('WCAG 2.2.2', 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide'),
        WCAG_2_3_1: content_page_1.guidanceLinkTo('WCAG 2.3.1', 'https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html'),
        WCAG_2_4_1: content_page_1.guidanceLinkTo('WCAG 2.4.1', 'https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks'),
        WCAG_2_4_2: content_page_1.guidanceLinkTo('WCAG 2.4.2', 'https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html'),
        WCAG_2_4_3: content_page_1.guidanceLinkTo('WCAG 2.4.3', 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html'),
        WCAG_2_4_4: content_page_1.guidanceLinkTo('WCAG 2.4.4', 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html'),
        WCAG_2_4_5: content_page_1.guidanceLinkTo('WCAG 2.4.5', 'https://www.w3.org/WAI/WCAG21/Understanding/multiple-ways.html'),
        WCAG_2_4_6: content_page_1.guidanceLinkTo('WCAG 2.4.6', 'https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels'),
        WCAG_2_4_7: content_page_1.guidanceLinkTo('WCAG 2.4.7', 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html'),
        WCAG_2_5_1: content_page_1.guidanceLinkTo('WCAG 2.5.1', 'https://www.w3.org/WAI/WCAG21/Understanding/pointer-gestures.html', [guidance_tags_1.guidanceTags.WCAG_2_1]),
        WCAG_2_5_2: content_page_1.guidanceLinkTo('WCAG 2.5.2', 'https://www.w3.org/WAI/WCAG21/Understanding/pointer-cancellation.html', [
            guidance_tags_1.guidanceTags.WCAG_2_1,
        ]),
        WCAG_2_5_3: content_page_1.guidanceLinkTo('WCAG 2.5.3', 'https://www.w3.org/WAI/WCAG21/Understanding/label-in-name', [guidance_tags_1.guidanceTags.WCAG_2_1]),
        WCAG_2_5_4: content_page_1.guidanceLinkTo('WCAG 2.5.4', 'https://www.w3.org/WAI/WCAG21/Understanding/motion-actuation.html', [guidance_tags_1.guidanceTags.WCAG_2_1]),
        WCAG_2_5_5: content_page_1.guidanceLinkTo('WCAG 2.5.5', 'https://www.w3.org/WAI/WCAG21/Understanding/target-size.html'),
        WCAG_3_1_1: content_page_1.guidanceLinkTo('WCAG 3.1.1', 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html'),
        WCAG_3_1_2: content_page_1.guidanceLinkTo('WCAG 3.1.2', 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-parts.html'),
        WCAG_3_2_1: content_page_1.guidanceLinkTo('WCAG 3.2.1', 'https://www.w3.org/WAI/WCAG21/Understanding/on-focus.html'),
        WCAG_3_2_2: content_page_1.guidanceLinkTo('WCAG 3.2.2', 'https://www.w3.org/WAI/WCAG21/Understanding/on-input.html'),
        WCAG_3_2_3: content_page_1.guidanceLinkTo('WCAG 3.2.3', 'https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation'),
        WCAG_3_2_4: content_page_1.guidanceLinkTo('WCAG 3.2.4', 'https://www.w3.org/WAI/WCAG21/Understanding/consistent-identification'),
        WCAG_3_3_1: content_page_1.guidanceLinkTo('WCAG 3.3.1', 'https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html'),
        WCAG_3_3_2: content_page_1.guidanceLinkTo('WCAG 3.3.2', 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html'),
        WCAG_3_3_3: content_page_1.guidanceLinkTo('WCAG 3.3.3', 'https://www.w3.org/WAI/WCAG21/Understanding/error-suggestion.html'),
        WCAG_3_3_4: content_page_1.guidanceLinkTo('WCAG 3.3.4', 'https://www.w3.org/WAI/WCAG21/Understanding/error-prevention-legal-financial-data.html'),
        WCAG_4_1_1: content_page_1.guidanceLinkTo('WCAG 4.1.1', 'https://www.w3.org/WAI/WCAG21/Understanding/parsing.html'),
        WCAG_4_1_2: content_page_1.guidanceLinkTo('WCAG 4.1.2', 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html'),
        WCAG_4_1_3: content_page_1.guidanceLinkTo('WCAG 4.1.3', 'https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html', [guidance_tags_1.guidanceTags.WCAG_2_1]),
        BingoBakery: content_page_1.linkTo('Bingo Bakery Video', 'https://go.microsoft.com/fwlink/?linkid=2080372'),
        IdentifyHeadings: content_page_1.linkTo('Techniques for WCAG 2.0: Using h1-h6 to identify headings', 'https://www.w3.org/TR/WCAG20-TECHS/H42.html'),
        LandmarkRegions: content_page_1.linkTo('WAI-ARIA Authoring Practices 1.1: Landmark Regions', 'https://www.w3.org/TR/wai-aria-practices-1.1/#aria_landmark'),
        Keyboard: content_page_1.linkTo('WebAIM: Keyboard Accessibility', 'https://aka.ms/webaim/keyboard-accessibility'),
        InteroperabilityWithAT: content_page_1.linkTo('Section 508 - 502.2.2', 'https://www.access-board.gov/guidelines-and-standards/communications-and-it/about-the-ict-refresh/final-rule/text-of-the-standards-and-guidelines#502-interoperability-assistive-technology'),
        Presbyopia: content_page_1.linkTo('presbyopia', 'https://en.wikipedia.org/wiki/Presbyopia'),
        WAIARIAAuthoringPractices: content_page_1.linkTo('WAI-ARIA Authoring Practices 1.1: Design Patterns and Widgets', 'https://www.w3.org/TR/wai-aria-practices-1.1/'),
        WCAG21UnderstandingUseOfColor: content_page_1.linkTo('Understanding Success Criterion 1.4.1: Use of Color', 'https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html'),
        WCAG21UnderstandingAudioOnlyViewOnlyPrerecorded: content_page_1.linkTo('Understanding Success Criterion 1.2.1: Audio-only and Video-only (Prerecorded)', 'https://www.w3.org/WAI/WCAG21/Understanding/audio-only-and-video-only-prerecorded.html'),
        WCAG21TechniquesG83: content_page_1.linkTo('Providing text descriptions to identify required fields that were not completed', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G83'),
        WCAG21TechniquesG89: content_page_1.linkTo('Providing expected data format and example', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G89'),
        WCAG21TechniquesG90: content_page_1.linkTo('Providing keyboard-triggered event handlers', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G90'),
        WCAG21TechniquesG131: content_page_1.linkTo('Providing descriptive labels', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G131'),
        WCAG21TechniquesG138: content_page_1.linkTo('Using semantic markup whenever color cues are used', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G138'),
        WCAG21TechniquesG158: content_page_1.linkTo('Providing an alternative for time-based media for audio-only content', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G158'),
        WCAG21TechniquesG159: content_page_1.linkTo('Providing an alternative for time-based media for video-only content', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G159'),
        WCAG21TechniquesG166: content_page_1.linkTo('Providing audio that describes the important video content and describing it as such', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G166'),
        WCAG21TechniquesG202: content_page_1.linkTo('Ensuring keyboard control for all functionality', 'https://www.w3.org/WAI/WCAG21/Techniques/general/G202'),
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/content/strings/application.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.androidAppTitle = exports.windowsProductName = exports.toolName = exports.productName = exports.title = exports.brand = void 0;
    // Copyright (c) Microsoft Corporation. All rights reserved.
    // Licensed under the MIT License.
    exports.brand = 'Accessibility Insights';
    exports.title = `${exports.brand} for Web`;
    exports.productName = exports.title;
    exports.toolName = exports.title;
    exports.windowsProductName = `${exports.brand} for Windows`;
    exports.androidAppTitle = `${exports.brand} for Android`;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/icons/ada/ada-laptop-base64.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.adaLaptop = void 0;
    exports.adaLaptop = 'data:image/png;base64,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';
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/icons/ada/ada-multicolor-bubbles-base64.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.adaMulticolorBubbles = void 0;
    exports.adaMulticolorBubbles = 'data:image/png;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgP+nHTgkAAAAABD0/7UrbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8ApoiPeOStFfXgAAAABJRU5ErkJggg==';
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/icons/ada/sleeping-ada-base64.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sleepingAda = void 0;
    exports.sleepingAda = 'data:image/png;base64,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';
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/icons/brand/blue/brand-blue-48px-base64.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.blue48 = void 0;
    exports.blue48 = 'data:image/png;base64,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';
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/icons/brand/white/brand-white.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BrandWhite = void 0;
    exports.BrandWhite = named_fc_1.NamedFC('BrandWhite', () => (React.createElement("svg", { role: "img", "aria-hidden": "true", className: "header-icon", viewBox: "0 0 48 48", fill: "none", xmlns: "http://www.w3.org/2000/svg" },
        React.createElement("mask", { id: "mask0", maskUnits: "userSpaceOnUse", x: "0", y: "3", width: "48", height: "43", style: { maskType: 'alpha' } },
            React.createElement("path", { d: "M43.8309 27.1383C49.3148 21.6544 49.3148 12.7633 43.8309 7.27934C38.347 1.79544 29.4558 1.79543 23.9719 7.27934C18.488 1.79544 9.59684 1.79544 4.11293 7.27934C-1.37098 12.7633 -1.37098 21.6544 4.11293 27.1383L21.986 45.0114C23.0828 46.1082 24.861 46.1082 25.9578 45.0114L43.8309 27.1383Z", fill: "white" })),
        React.createElement("g", { mask: "url(#mask0)" },
            React.createElement("path", { d: "M43.8309 27.1383C49.3148 21.6544 49.3148 12.7633 43.8309 7.27934C38.347 1.79544 29.4558 1.79543 23.9719 7.27934C18.488 1.79544 9.59684 1.79544 4.11293 7.27934C-1.37098 12.7633 -1.37098 21.6544 4.11293 27.1383L21.986 45.0114C23.0828 46.1082 24.861 46.1082 25.9578 45.0114L43.8309 27.1383Z", fill: "white" }),
            React.createElement("rect", { x: "43.9494", y: "7.24556", width: "14.0948", height: "42.2726", transform: "rotate(45 43.9494 7.24556)", fill: "#D6E9F7" }),
            React.createElement("mask", { id: "mask1", maskUnits: "userSpaceOnUse", x: "-6", y: "-3", width: "30", height: "31", style: { maskType: 'alpha' } },
                React.createElement("path", { d: "M23.9718 7.27863L4.11284 27.1376C-1.37106 21.6537 -1.37106 12.7625 4.11284 7.27863C9.59675 1.79472 18.4879 1.79472 23.9718 7.27863Z", fill: "#CFEBFF" }),
                React.createElement("path", { d: "M23.9718 7.27863L4.11284 27.1376C-1.37106 21.6537 -1.37106 12.7625 4.11284 7.27863C9.59675 1.79472 18.4879 1.79472 23.9718 7.27863Z", fill: "url(#paint0_linear)" })),
            React.createElement("g", { mask: "url(#mask1)" },
                React.createElement("path", { d: "M23.9718 7.27863L4.11284 27.1376C-1.37106 21.6537 -1.37106 12.7625 4.11284 7.27863C9.59675 1.79472 18.4879 1.79472 23.9718 7.27863Z", fill: "white" }),
                React.createElement("path", { d: "M23.9718 7.27863L4.11284 27.1376C-1.37106 21.6537 -1.37106 12.7625 4.11284 7.27863C9.59675 1.79472 18.4879 1.79472 23.9718 7.27863Z", fill: "url(#paint1_linear)" }),
                React.createElement("rect", { x: "4.54834", y: "6.88206", width: "16.3577", height: "42.2726", transform: "rotate(-45 4.54834 6.88206)", fill: "#D6E9F7" }),
                React.createElement("rect", { x: "4.54834", y: "6.88206", width: "16.3577", height: "42.2726", transform: "rotate(-45 4.54834 6.88206)", fill: "url(#paint2_linear)" })),
            React.createElement("g", { filter: "url(#filter0_d)" },
                React.createElement("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M34.0764 27.3564C39.8071 27.3483 44.4461 22.6961 44.438 16.9655C44.4299 11.2349 39.7778 6.59585 34.0472 6.60393C28.3165 6.61201 23.6775 11.2642 23.6856 16.9948C23.6888 19.2829 24.4324 21.397 25.6895 23.1108L23.4287 25.3788C22.8852 25.395 22.3466 25.6109 21.9324 26.0265L17.1218 30.8526C16.4185 31.5582 16.4203 32.7005 17.126 33.4038L17.6952 33.9713C18.4009 34.6746 19.5431 34.6728 20.2465 33.9671L25.057 29.141C25.4715 28.7252 25.6857 28.1855 25.6998 27.6415L27.9603 25.3737C29.6766 26.6235 31.7907 27.3596 34.0764 27.3564ZM34.0368 23.2439C37.4964 23.2579 40.3122 20.4647 40.3262 17.0051C40.3401 13.5456 37.5469 10.7298 34.0874 10.7158C30.6279 10.7018 27.812 13.495 27.7981 16.9545C27.7841 20.4141 30.5773 23.2299 34.0368 23.2439Z", fill: "#004880" }))),
        React.createElement("defs", null,
            React.createElement("filter", { id: "filter0_d", x: "15.748", y: "6.50654", width: "29.5246", height: "29.5269", filterUnits: "userSpaceOnUse", colorInterpolationFilters: "sRGB" },
                React.createElement("feFlood", { floodOpacity: "0", result: "BackgroundImageFix" }),
                React.createElement("feColorMatrix", { in: "SourceAlpha", type: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" }),
                React.createElement("feOffset", { dy: "0.725705" }),
                React.createElement("feGaussianBlur", { stdDeviation: "0.40317" }),
                React.createElement("feColorMatrix", { type: "matrix", values: "0 0 0 0 0.0447352 0 0 0 0 0.305769 0 0 0 0 0.492222 0 0 0 0.51 0" }),
                React.createElement("feBlend", { mode: "normal", in2: "BackgroundImageFix", result: "effect1_dropShadow" }),
                React.createElement("feBlend", { mode: "normal", in: "SourceGraphic", in2: "effect1_dropShadow", result: "shape" })),
            React.createElement("linearGradient", { id: "paint0_linear", x1: "14.3166", y1: "16.8744", x2: "5.92409", y2: "8.23504", gradientUnits: "userSpaceOnUse" },
                React.createElement("stop", { offset: "0", stopColor: "#073A5F", stopOpacity: "0.3" }),
                React.createElement("stop", { offset: "1", stopColor: "#CFEBFF", stopOpacity: "0" })),
            React.createElement("linearGradient", { id: "paint1_linear", x1: "14.3166", y1: "16.8744", x2: "5.92409", y2: "8.23504", gradientUnits: "userSpaceOnUse" },
                React.createElement("stop", { offset: "0", stopColor: "#165B8E", stopOpacity: "0.29" }),
                React.createElement("stop", { offset: "1", stopColor: "white", stopOpacity: "0" })),
            React.createElement("linearGradient", { id: "paint2_linear", x1: "11.3179", y1: "20.1024", x2: "11.0819", y2: "11.1606", gradientUnits: "userSpaceOnUse" },
                React.createElement("stop", { offset: "0", stopColor: "#165B8E", stopOpacity: "0.29" }),
                React.createElement("stop", { offset: "1", stopColor: "#D6E9F7", stopOpacity: "0" }))))));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/injected/adapters/resolution-creator.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getCheckResolution = exports.getFixResolution = void 0;
    exports.getFixResolution = (data) => {
        return {
            'how-to-fix-web': {
                any: data.nodeResult.any.map(checkResult => checkResult.message),
                none: data.nodeResult.none.map(checkResult => checkResult.message),
                all: data.nodeResult.all.map(checkResult => checkResult.message),
            },
        };
    };
    exports.getCheckResolution = (data) => {
        return {
            'how-to-check-web': data.id,
        };
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/injected/adapters/scan-results-to-unified-results.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash"), __webpack_require__("./src/issue-filing/common/issue-filing-url-string-utils.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1, issue_filing_url_string_utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ConvertScanResultsToUnifiedResults = void 0;
    class ConvertScanResultsToUnifiedResults {
        constructor(uuidGenerator, getFixResolution, getCheckResolution) {
            this.uuidGenerator = uuidGenerator;
            this.getFixResolution = getFixResolution;
            this.getCheckResolution = getCheckResolution;
            this.automatedChecksConversion = (scanResults) => {
                if (!scanResults) {
                    return [];
                }
                return this.automatedChecksCreateUnifiedResultsFromScanResults(scanResults);
            };
            this.automatedChecksCreateUnifiedResultsFromScanResults = (scanResults) => {
                return [
                    ...this.createUnifiedResultsFromRuleResults(scanResults.violations, 'fail', this.getFixResolution),
                    ...this.createUnifiedResultsFromRuleResults(scanResults.passes, 'pass', this.getFixResolution),
                ];
            };
            this.needsReviewConversion = (scanResults) => {
                if (!scanResults) {
                    return [];
                }
                return this.needsReviewCreateUnifiedResultsFromScanResults(scanResults);
            };
            this.needsReviewCreateUnifiedResultsFromScanResults = (scanResults) => {
                return [
                    ...this.createUnifiedResultsFromRuleResults(scanResults.incomplete, 'unknown', this.getCheckResolution),
                    ...this.createUnifiedResultsFromRuleResults(scanResults.violations, 'unknown', this.getCheckResolution),
                ];
            };
            this.createUnifiedResultsFromRuleResults = (ruleResults, status, getResolution) => {
                const unifiedResultFromRuleResults = (ruleResults || []).map(result => this.createUnifiedResultsFromRuleResult(result, status, getResolution));
                return lodash_1.flatMap(unifiedResultFromRuleResults);
            };
            this.createUnifiedResultsFromRuleResult = (ruleResult, status, getResolution) => {
                return ruleResult.nodes.map(node => {
                    const data = {
                        status: status,
                        ruleID: ruleResult.id,
                    };
                    return this.createUnifiedResultFromNode(node, data, getResolution);
                });
            };
            this.createUnifiedResultFromNode = (nodeResult, ruleResultData, getResolution) => {
                const cssSelector = nodeResult.target.join(';');
                return {
                    uid: this.uuidGenerator(),
                    status: ruleResultData.status,
                    ruleId: ruleResultData.ruleID,
                    identifiers: {
                        identifier: cssSelector,
                        conciseName: issue_filing_url_string_utils_1.IssueFilingUrlStringUtils.getSelectorLastPart(cssSelector),
                        'css-selector': cssSelector,
                    },
                    descriptors: {
                        snippet: nodeResult.snippet || nodeResult.html,
                    },
                    resolution: Object.assign({ howToFixSummary: nodeResult.failureSummary }, getResolution({ id: ruleResultData.ruleID, nodeResult: nodeResult })),
                };
            };
        }
    }
    exports.ConvertScanResultsToUnifiedResults = ConvertScanResultsToUnifiedResults;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/injected/adapters/scan-results-to-unified-rules.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.convertScanResultsToUnifiedRules = void 0;
    function convertScanResultsToUnifiedRules(scanResults) {
        if (!scanResults) {
            return [];
        }
        return createUnifiedRulesFromScanResults(scanResults);
    }
    exports.convertScanResultsToUnifiedRules = convertScanResultsToUnifiedRules;
    function createUnifiedRulesFromScanResults(scanResults) {
        const unifiedRules = [];
        const ruleIds = new Set();
        const allRuleResults = getAllRuleResults(scanResults);
        for (const ruleResult of allRuleResults) {
            if (!ruleIds.has(ruleResult.id)) {
                unifiedRules.push(createUnifiedRuleFromRuleResult(ruleResult));
                ruleIds.add(ruleResult.id);
            }
        }
        return unifiedRules;
    }
    function getAllRuleResults(scanResults) {
        return [
            ...scanResults.passes,
            ...scanResults.violations,
            ...scanResults.incomplete,
            ...scanResults.inapplicable,
        ];
    }
    function createUnifiedRuleFromRuleResult(ruleResult) {
        return {
            id: ruleResult.id,
            description: ruleResult.description,
            url: ruleResult.helpUrl,
            guidance: ruleResult.guidanceLinks,
        };
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/injected/components/command-bar.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/common/components/copy-issue-details-button.tsx"), __webpack_require__("./src/common/components/issue-filing-button.tsx"), __webpack_require__("./src/common/components/issue-filing-needs-settings-help-text.tsx"), __webpack_require__("./src/common/icons/file-html-icon.tsx"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, office_ui_fabric_react_1, React, copy_issue_details_button_1, issue_filing_button_1, issue_filing_needs_settings_help_text_1, file_html_icon_1, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CommandBar = void 0;
    exports.CommandBar = named_fc_1.NamedFC('CommandBar', props => {
        const renderInspectButton = () => {
            return (React.createElement(office_ui_fabric_react_1.DefaultButton, { className: "insights-dialog-button-inspect", onClick: props.onClickInspectButton },
                React.createElement(file_html_icon_1.FileHTMLIcon, null),
                React.createElement("div", { className: "ms-Button-label" }, "Inspect HTML")));
        };
        const renderIssueButtons = () => {
            const failedRuleIds = Object.keys(props.failedRules);
            const ruleName = failedRuleIds[props.currentRuleIndex];
            const ruleResult = props.failedRules[ruleName];
            const issueData = props.deps.axeResultToIssueFilingDataConverter.convert(ruleResult, document.title, document.URL);
            return (React.createElement(React.Fragment, null,
                React.createElement(copy_issue_details_button_1.CopyIssueDetailsButton, { deps: props.deps, issueDetailsData: issueData, onClick: props.onClickCopyIssueDetailsButton }),
                renderFileIssueButton(issueData)));
        };
        const renderFileIssueButton = (issueData) => {
            return (React.createElement(issue_filing_button_1.IssueFilingButton, { deps: props.deps, issueDetailsData: issueData, userConfigurationStoreData: props.userConfigurationStoreData, needsSettingsContentRenderer: issue_filing_needs_settings_help_text_1.IssueFilingNeedsSettingsHelpText }));
        };
        const renderInspectMessage = () => {
            if (props.shouldShowInspectButtonMessage()) {
                return (React.createElement("div", { role: "alert", className: "insights-dialog-inspect-disabled" }, `To use the Inspect HTML button, first open the developer tools (${props.devToolsShortcut}).`));
            }
        };
        return (React.createElement("div", { className: "insights-dialog-target-button-container" },
            renderInspectButton(),
            renderIssueButtons(),
            renderInspectMessage()));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/injected/components/details-dialog.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/fix-instruction-panel.tsx"), __webpack_require__("lodash"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/common/components/guidance-links.tsx"), __webpack_require__("./src/common/components/new-tab-link.tsx"), __webpack_require__("./src/common/feature-flags.ts"), __webpack_require__("./src/common/icons/cancel-icon.tsx"), __webpack_require__("./src/injected/components/command-bar.tsx"), __webpack_require__("./src/injected/components/issue-details-navigation-controls.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, fix_instruction_panel_1, lodash_1, office_ui_fabric_react_1, office_ui_fabric_react_2, React, guidance_links_1, new_tab_link_1, feature_flags_1, cancel_icon_1, command_bar_1, issue_details_navigation_controls_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DetailsDialog = exports.CheckType = void 0;
    var CheckType;
    (function (CheckType) {
        CheckType[CheckType["All"] = 0] = "All";
        CheckType[CheckType["Any"] = 1] = "Any";
        CheckType[CheckType["None"] = 2] = "None";
    })(CheckType = exports.CheckType || (exports.CheckType = {}));
    class DetailsDialog extends React.Component {
        constructor(props) {
            super(props);
            this.onHideDialog = () => {
                this.props.dialogHandler.hideDialog(this);
            };
            this.onClickNextButton = () => {
                this.props.dialogHandler.nextButtonClickHandler(this);
            };
            this.onClickBackButton = () => {
                this.props.dialogHandler.backButtonClickHandler(this);
            };
            this.onClickInspectButton = (ev) => {
                this.props.dialogHandler.inspectButtonClickHandler(this, ev);
            };
            this.onLayoutDidMount = () => {
                this.props.dialogHandler.onLayoutDidMount();
            };
            this.componentDidMount = () => {
                this.props.dialogHandler.componentDidMount(this);
            };
            this.componentWillUnmount = () => {
                this.props.dialogHandler.componentWillUnmount(this);
            };
            this.onClickNextButton = () => {
                this.props.dialogHandler.nextButtonClickHandler(this);
            };
            this.onClickBackButton = () => {
                this.props.dialogHandler.backButtonClickHandler(this);
            };
            this.isBackButtonDisabled = () => {
                return this.props.dialogHandler.isBackButtonDisabled(this);
            };
            this.isNextButtonDisabled = () => {
                return this.props.dialogHandler.isNextButtonDisabled(this);
            };
            this.isInspectButtonDisabled = () => {
                return this.props.dialogHandler.isInspectButtonDisabled(this);
            };
            this.state = {
                showDialog: true,
                currentRuleIndex: 0,
                canInspect: true,
                showInspectMessage: false,
                userConfigurationStoreData: props.userConfigStore.getState(),
            };
        }
        render() {
            const failedRuleIds = Object.keys(this.props.failedRules);
            const ruleName = failedRuleIds[this.state.currentRuleIndex];
            const rule = this.props.failedRules[ruleName];
            if (this.props.featureFlagStoreData[feature_flags_1.FeatureFlags.shadowDialog]) {
                return this.withshadowDomTurnedOn(rule);
            }
            else {
                return this.withshadowDomTurnedOff(rule);
            }
        }
        getOnClickWhenNotInShadowDom(func) {
            if (this.props.featureFlagStoreData[feature_flags_1.FeatureFlags.shadowDialog]) {
                return null;
            }
            else {
                return func;
            }
        }
        renderCommandBar() {
            const props = {
                currentRuleIndex: this.state.currentRuleIndex,
                deps: this.props.deps,
                devToolsShortcut: this.props.devToolsShortcut,
                failedRules: this.props.failedRules,
                onClickCopyIssueDetailsButton: this.props.deps.targetPageActionMessageCreator
                    .copyIssueDetailsClicked,
                onClickInspectButton: this.getOnClickWhenNotInShadowDom(this.onClickInspectButton),
                shouldShowInspectButtonMessage: () => this.props.dialogHandler.shouldShowInspectButtonMessage(this),
                userConfigurationStoreData: this.state.userConfigurationStoreData,
            };
            return React.createElement(command_bar_1.CommandBar, Object.assign({}, props));
        }
        renderCloseIcon() {
            return React.createElement(cancel_icon_1.CancelIcon, null);
        }
        renderNextAndBackButtons() {
            const navigationControlsProps = {
                container: this,
                dialogHandler: this.props.dialogHandler,
                featureFlagStoreData: this.props.featureFlagStoreData,
                failuresCount: lodash_1.size(this.props.failedRules),
            };
            return React.createElement(issue_details_navigation_controls_1.IssueDetailsNavigationControls, Object.assign({}, navigationControlsProps));
        }
        renderSectionTitle(sectionTitle, ariaLabel) {
            return (React.createElement("h3", { className: office_ui_fabric_react_1.css('insights-dialog-section-title'), id: ariaLabel }, sectionTitle));
        }
        renderRuleName(rule) {
            const fixUrl = (url) => {
                if (url.indexOf('://') >= 0) {
                    return url;
                }
                else {
                    const { browserAdapter } = this.props.deps;
                    return browserAdapter.getUrl(url);
                }
            };
            const ruleNameID = 'rule-name';
            return (React.createElement("section", { className: "insights-dialog-rule-name", "aria-labelledby": ruleNameID },
                this.renderSectionTitle('Rule name', ruleNameID),
                React.createElement(new_tab_link_1.NewTabLink, { href: fixUrl(rule.helpUrl) }, rule.ruleId)));
        }
        renderSuccessCriteria(ruleGuidanceLinks) {
            if (lodash_1.isEmpty(ruleGuidanceLinks)) {
                return null;
            }
            const sectionTitle = ruleGuidanceLinks.length === 1 ? 'Success criterion' : 'Success criteria';
            const successTitleId = 'success-criteria';
            return (React.createElement("section", { className: "insights-dialog-success-criteria", "aria-labelledby": successTitleId },
                this.renderSectionTitle(sectionTitle, successTitleId),
                React.createElement("div", null,
                    React.createElement(guidance_links_1.GuidanceLinks, { links: ruleGuidanceLinks, LinkComponent: this.props.deps.LinkComponent }))));
        }
        renderPathSelector() {
            return (React.createElement("section", { className: "insights-dialog-path-selector-container" },
                this.renderSectionTitle('Path'),
                this.props.elementSelector));
        }
        renderFixInstructions(ruleResult) {
            return (React.createElement("div", { className: "insights-dialog-fix-instruction-container" },
                React.createElement(fix_instruction_panel_1.FixInstructionPanel, { deps: this.props.deps, checkType: CheckType.All, checks: ruleResult.all.concat(ruleResult.none), renderTitleElement: this.renderSectionTitle }),
                React.createElement(fix_instruction_panel_1.FixInstructionPanel, { deps: this.props.deps, checkType: CheckType.Any, checks: ruleResult.any, renderTitleElement: this.renderSectionTitle })));
        }
        renderDialogContent(rule) {
            return (React.createElement("div", { className: "insights-dialog-content" },
                this.renderRuleName(rule),
                this.renderSuccessCriteria(rule.guidanceLinks),
                this.renderPathSelector(),
                this.renderCommandBar(),
                this.renderFixInstructions(rule),
                this.renderNextAndBackButtons()));
        }
        withshadowDomTurnedOn(rule) {
            return (React.createElement("div", { style: { visibility: this.state.showDialog ? 'visible' : 'hidden' }, className: "insights-dialog-main-override-shadow" },
                React.createElement("div", { className: "insights-dialog-container" },
                    React.createElement("div", { className: "insights-dialog-header" },
                        React.createElement("p", { className: "ms-Dialog-title insights-dialog-title" }, rule.help),
                        React.createElement("div", { className: "ms-Dialog-topButton" },
                            React.createElement("button", { type: "button", className: "ms-Dialog-button ms-Dialog-button--close ms-Button ms-Button--icon insights-dialog-close", "aria-label": "Close", "data-is-focusable": "true" },
                                React.createElement("span", { className: "ms-button-flex-container" },
                                    React.createElement(cancel_icon_1.CancelIcon, null))))),
                    this.renderDialogContent(rule))));
        }
        withshadowDomTurnedOff(rule) {
            return (React.createElement(office_ui_fabric_react_2.Dialog, { hidden: !this.state.showDialog, 
                // Used top button instead of default close button to avoid use of fabric icons that might not load due to target page's Content Security Policy
                dialogContentProps: {
                    type: office_ui_fabric_react_2.DialogType.normal,
                    showCloseButton: false,
                    topButtonsProps: [
                        {
                            ariaLabel: 'Close',
                            onRenderIcon: this.renderCloseIcon,
                            onClick: this.onHideDialog,
                        },
                    ],
                    styles: { title: 'insights-dialog-title' },
                }, modalProps: {
                    isBlocking: false,
                    containerClassName: 'insights-dialog-main-override insights-dialog-main-container',
                    layerProps: {
                        onLayerDidMount: this.onLayoutDidMount,
                        hostId: 'insights-dialog-layer-host',
                    },
                }, onDismiss: this.onHideDialog, title: rule.help }, this.renderDialogContent(rule)));
        }
    }
    exports.DetailsDialog = DetailsDialog;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/injected/components/issue-details-navigation-controls.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/common/feature-flags.ts"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, office_ui_fabric_react_1, React, feature_flags_1, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueDetailsNavigationControls = void 0;
    exports.IssueDetailsNavigationControls = named_fc_1.NamedFC('IssueDetailsNavigationControls', props => {
        const onClickNextButton = event => props.dialogHandler.nextButtonClickHandler(props.container);
        const onClickBackButton = event => props.dialogHandler.backButtonClickHandler(props.container);
        const getOnClickWhenNotInShadowDom = (func) => {
            if (props.featureFlagStoreData[feature_flags_1.FeatureFlags.shadowDialog]) {
                return null;
            }
            else {
                return func;
            }
        };
        if (props.failuresCount <= 1) {
            return null;
        }
        const renderBackButton = () => !props.dialogHandler.isBackButtonDisabled(props.container) && (React.createElement(office_ui_fabric_react_1.DefaultButton, { "data-automation-id": "back", text: "< Back", onClick: getOnClickWhenNotInShadowDom(onClickBackButton) }));
        const renderNextButton = () => !props.dialogHandler.isNextButtonDisabled(props.container) && (React.createElement(office_ui_fabric_react_1.DefaultButton, { "data-automation-id": "next", text: "Next >", onClick: getOnClickWhenNotInShadowDom(onClickNextButton) }));
        return (React.createElement("div", { className: "insights-dialog-next-and-back-container" },
            React.createElement("div", null, renderBackButton()),
            React.createElement("div", null, props.dialogHandler.getFailureInfo(props.container)),
            React.createElement("div", null, renderNextButton())));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/issue-filing/common/issue-filing-url-string-utils.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueFilingUrlStringUtils = void 0;
    const getTitle = (data) => {
        const standardTags = standardizeTags(data);
        let prefix = standardTags.join(',');
        if (prefix.length > 0) {
            prefix = prefix + ': ';
        }
        return `${prefix}${data.rule.description} (${data.element.conciseName})`;
    };
    const getSelectorLastPart = (selector) => {
        const splitedSelector = selector.split(';');
        const selectorLastPart = splitedSelector[splitedSelector.length - 1];
        const childCombinator = ' > ';
        if (selectorLastPart.lastIndexOf(childCombinator) > 0) {
            return selectorLastPart.substr(selectorLastPart.lastIndexOf(childCombinator) + childCombinator.length);
        }
        return selectorLastPart;
    };
    const standardizeTags = (data) => {
        const guidanceLinkTextTags = data.rule.guidance.map(link => link.text.toUpperCase());
        const tagsFromGuidanceLinkTags = [];
        data.rule.guidance.map(link => link.tags ? link.tags.map(tag => tagsFromGuidanceLinkTags.push(tag.displayText)) : []);
        return guidanceLinkTextTags.concat(tagsFromGuidanceLinkTags);
    };
    exports.IssueFilingUrlStringUtils = {
        getTitle,
        getSelectorLastPart,
        standardizeTags,
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/issue-filing/components/issue-filing-choice-group.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/DetailsView/components/details-view-overlay/settings-panel/settings/issue-filing/issue-filing-settings.tsx"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, issue_filing_settings_1, office_ui_fabric_react_1, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueFilingChoiceGroup = void 0;
    exports.IssueFilingChoiceGroup = named_fc_1.NamedFC('IssueFilingChoiceGroup', props => {
        const getOptions = () => {
            return props.issueFilingServices.map(service => {
                return {
                    key: service.key,
                    text: service.displayName,
                };
            });
        };
        const onChange = (ev, option) => {
            const payload = {
                issueFilingServiceName: option.key,
            };
            props.onSelectedServiceChange(payload);
        };
        return (React.createElement(office_ui_fabric_react_1.ChoiceGroup, { className: 'issue-filing-choice-group', ariaLabelledBy: issue_filing_settings_1.issueFilingTitleId, onChange: onChange, options: getOptions(), selectedKey: props.selectedIssueFilingService.key }));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/issue-filing/components/issue-filing-settings-container.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/issue-filing/components/issue-filing-choice-group.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1, issue_filing_choice_group_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IssueFilingSettingsContainer = void 0;
    exports.IssueFilingSettingsContainer = named_fc_1.NamedFC('IssueFilingSettingsContainer', props => {
        const { deps, selectedIssueFilingService, selectedIssueFilingServiceData } = props;
        const SettingsForm = selectedIssueFilingService.settingsForm;
        const issueFilingServices = deps.issueFilingServiceProvider.allVisible();
        return (React.createElement(React.Fragment, null,
            React.createElement(issue_filing_choice_group_1.IssueFilingChoiceGroup, { onSelectedServiceChange: props.onSelectedServiceChange, selectedIssueFilingService: selectedIssueFilingService, issueFilingServices: issueFilingServices }),
            React.createElement(SettingsForm, { deps: deps, settings: selectedIssueFilingServiceData, onPropertyUpdateCallback: props.onPropertyUpdateCallback })));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/automated-checks-report.styles.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.styleSheet = void 0;
    // Copyright (c) Microsoft Corporation. All rights reserved.
    // Licensed under the MIT License.
    exports.styleSheet = `:root {\
  --black: #000000;\
  --light-black: #161616;\
  --white: #ffffff;\
  --brand-blue: #004880;\
  --grey: #333333;\
  --ada-brand-color: var(--brand-blue);\
  --primary-text: rgba(0, 0, 0, 0.9);\
  --secondary-text: rgba(0, 0, 0, 0.7);\
  --disabled-text: rgba(0, 0, 0, 0.38);\
  --communication-primary: #106ebe;\
  --communication-tint-40: #eff6fc;\
  --communication-tint-30: #deecf9;\
  --communication-tint-20: #c7e0f4;\
  --communication-tint-10: #2b88d8;\
  --communication-shade-20: #004578;\
  --neutral-0: var(--white);\
  --neutral-2: #f8f8f8;\
  --neutral-3: #f6f6f6;\
  --neutral-4: #f4f4f4;\
  --neutral-6: #f2f2f2;\
  --neutral-6-5: #f1f1f1;\
  --neutral-8: #ebebeb;\
  --neutral-10: #dedede;\
  --neutral-20: #c8c8c8;\
  --neutral-30: #a6a6a6;\
  --neutral-55: #6e6e6e;\
  --neutral-60: #666666;\
  --neutral-70: #3c3c3c;\
  --neutral-80: var(--grey);\
  --neutral-100: var(--black);\
  --neutral-alpha-2: rgba(0, 0, 0, 0.02);\
  --neutral-alpha-4: rgba(0, 0, 0, 0.04);\
  --neutral-alpha-6: rgba(0, 0, 0, 0.06);\
  --neutral-alpha-8: rgba(0, 0, 0, 0.08);\
  --neutral-alpha-10: rgba(0, 0, 0, 0.1);\
  --neutral-alpha-20: rgba(0, 0, 0, 0.2);\
  --neutral-alpha-30: rgba(0, 0, 0, 0.3);\
  --neutral-alpha-60: rgba(0, 0, 0, 0.6);\
  --neutral-alpha-70: rgba(0, 0, 0, 0.7);\
  --neutral-alpha-80: rgba(0, 0, 0, 0.8);\
  --neutral-alpha-90: rgba(0, 0, 0, 0.9);\
  --positive-outcome: #228722;\
  --negative-outcome: #e81123;\
  --neutral-outcome: var(--neutral-60);\
  --box-shadow-108: rgba(0, 0, 0, 0.108);\
  --box-shadow-132: rgba(0, 0, 0, 0.132);\
  --box-shadow-27: rgba(0, 0, 0, 0.27);\
  --screenshot-image-outline: #8b8b8b;\
  --card-border: transparent;\
  --card-footer-border: var(--neutral-10);\
  --header-bar-title-color: var(--neutral-0);\
  --help-links-section-background: var(--neutral-4);\
  --help-links-section-border: var(--neutral-4);\
  --index-circle-background: var(--communication-primary);\
  --link-hover: var(--communication-shade-20);\
  --link: var(--communication-primary);\
  --menu-border: var(--neutral-3);\
  --menu-item-background-active: var(--neutral-alpha-8);\
  --menu-item-background-hover: var(--neutral-alpha-4);\
  --left-nav-icon: var(--neutral-55);\
  --pill-background: var(--neutral-alpha-8);\
  --pill: var(--primary-text);\
  --spinner-text: var(--communication-primary);\
  --nav-link-hover: var(--neutral-alpha-8);\
  --nav-link-selected: var(--communication-tint-20);\
  --nav-link-expanded: var(--communication-tint-40);\
  --insights-button-hover: #0179d4;\
  --landmark-contentinfo: #00a88c;\
  --landmark-main: #cb2e6d;\
  --landmark-complementary: #6b9d1a;\
  --landmark-banner: #d08311;\
  --landmark-region: #2560e0;\
  --landmark-navigation: #9b38e6;\
  --landmark-search: #d363d8;\
  --landmark-form: #0298c7;\
}\
\
:root .high-contrast-theme {\
  --ada-brand-color: var(--white);\
  --secondary-text: var(--white);\
  --primary-text: var(--white);\
  --disabled-text: #c285ff;\
  --communication-tint-40: #38a9ff;\
  --communication-tint-30: var(--communication-tint-10);\
  --neutral-0: var(--light-black);\
  --neutral-2: var(--light-black);\
  --neutral-3: var(--light-black);\
  --neutral-4: var(--light-black);\
  --neutral-6: var(--light-black);\
  --neutral-6-5: var(--light-black);\
  --neutral-8: var(--white);\
  --neutral-10: var(--light-black);\
  --neutral-20: var(--white);\
  --neutral-30: var(--white);\
  --neutral-55: var(--white);\
  --neutral-60: var(--white);\
  --neutral-70: var(--white);\
  --neutral-80: var(--white);\
  --neutral-100: var(--white);\
  --neutral-alpha-8: var(--white);\
  --neutral-alpha-90: var(--white);\
  --positive-outcome: #4ac94a;\
  --negative-outcome: #fc7ab1;\
  --neutral-outcome: var(--neutral-0);\
  --card-border: var(--white);\
  --card-footer-border: var(--white);\
  --header-bar-title-color: var(--brand-blue);\
  --help-links-section-background: transparent;\
  --help-links-section-border: var(--white);\
  --index-circle-background: var(--communication-tint-40);\
  --link-hover: #ffff00;\
  --link: #ffff00;\
  --menu-border: var(--grey);\
  --menu-item-background-active: var(--communication-tint-40);\
  --menu-item-background-hover: var(--grey);\
  --left-nav-icon: var(--black);\
  --pill-background: var(--white);\
  --pill: var(--black);\
  --screenshot-image-outline: var(--white);\
  --spinner-text: var(--communication-tint-40);\
  --nav-link-hover: #2a2a2a;\
  --nav-link-selected: var(--communication-tint-40);\
  --nav-link-expanded: transparent;\
}\
\
.ms-Fabric.is-focusVisible .ms-Nav-group .ms-nav-linkButton:focus::after {\
  border: 1px solid var(--neutral-100);\
}\
\
@media screen and (-ms-high-contrast: active) {\
  .ms-Fabric.is-focusVisible .ms-Nav-group .ms-nav-linkButton:focus::after {\
    border: 1px dashed windowtext !important;\
  }\
}\
\
button::after {\
  content: '';\
  position: absolute;\
}\
\
.ms-fontColor-neutralPrimary,\
.ms-fontColor-neutralPrimary--hover:hover {\
  color: var(--neutral-100) !important;\
}\
\
.ms-Fabric {\
  color: var(--neutral-100);\
}\
\
.high-contrast-theme .insights-link:hover {\
  text-decoration: underline;\
}\
\
.high-contrast-theme .is-selected .status-icon {\
  color: var(--black) !important;\
}\
\
.insights-link {\
  color: var(--link) !important;\
  text-decoration: none;\
}\
\
.insights-link:hover {\
  color: var(--link-hover) !important;\
  text-decoration: underline;\
}\
\
.ms-Spinner .ms-Spinner-circle {\
  border-top-color: var(--spinner-text);\
}\
\
.ms-Spinner .ms-Spinner-label {\
  color: var(--spinner-text);\
}\
\
.guidance-tags span {\
  font-size: 12px;\
  font-weight: normal;\
  margin-left: 8px;\
  padding: 2px 12px;\
  color: var(--pill);\
  background-color: var(--pill-background);\
  border-radius: 120px;\
}\
\
.instance-details-card {\
  border-radius: 4px;\
  border: 1px solid var(--card-border);\
  outline-style: 'border-style';\
  box-shadow: 0px 0.6px 1.8px var(--box-shadow-108), 0px 3.2px 7.2px var(--box-shadow-132);\
  margin-bottom: 16px;\
  cursor: pointer;\
  width: -moz-available;\
  /* WebKit-based browsers will ignore this. */\
  width: -webkit-fill-available;\
  /* Mozilla-based browsers will ignore this. */\
  width: fill-available;\
}\
\
.instance-details-card-container.selected {\
  outline: 5px solid var(--communication-tint-10);\
}\
\
.instance-details-card.selected {\
  border: 1px solid transparent;\
}\
\
.instance-details-card:focus {\
  outline: 2px solid var(--primary-text);\
  outline-offset: 2px;\
}\
\
.instance-details-card.selected:focus {\
  outline-offset: 8px;\
}\
\
.instance-details-card:hover {\
  box-shadow: 0px 8px 10px var(--box-shadow-108), 0px 8px 10px var(--box-shadow-132);\
}\
\
.report-instance-table {\
  background: var(--neutral-0);\
  display: table;\
  table-layout: fixed;\
  width: -moz-available;\
  /* WebKit-based browsers will ignore this. */\
  width: -webkit-fill-available;\
  /* Mozilla-based browsers will ignore this. */\
  width: fill-available;\
  border-radius: inherit;\
}\
\
.report-instance-table th {\
  padding: 12px 20px;\
  vertical-align: top;\
}\
\
.report-instance-table .row {\
  top: calc(50% - 20px / 2);\
  border-bottom: 0.5px solid var(--neutral-10);\
}\
\
.report-instance-table .row:last-child {\
  border-bottom: none;\
}\
\
.report-instance-table .label {\
  font-size: 14px;\
  line-height: 20px;\
  font-family: 'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';\
  color: var(--primary-text);\
  text-align: left;\
  width: 70px;\
}\
\
.report-instance-table .instance-list-row-content {\
  color: var(--secondary-text);\
  padding: 12px 20px;\
  font-size: 14px;\
  line-height: 20px;\
  align-items: flex-end;\
  display: flex;\
}\
\
.report-instance-table .instance-list-row-content.content-snipppet {\
  font-family: Consolas, Segoe UI, Courier New, monospace;\
  white-space: normal;\
  word-wrap: break-word;\
  word-break: break-word;\
}\
\
table.report-instance-table {\
  border-collapse: collapse;\
  overflow-x: auto;\
  word-break: break-word;\
}\
\
@media screen and (max-width: 480px) {\
  .report-instance-table tr {\
    display: block;\
  }\
  .report-instance-table td {\
    display: block;\
  }\
  .report-instance-table td .label {\
    text-align: left;\
  }\
  .report-instance-table td .instance-list-row-content {\
    text-align: right;\
  }\
  .report-instance-table td::before {\
    float: left;\
  }\
  .report-instance-table .label {\
    padding: 14px 20px 6px 20px;\
  }\
  .report-instance-table .instance-list-row-content {\
    padding: 6px 20px 14px 20px;\
  }\
}\
\
.outcome-summary-bar {\
  display: flex;\
  flex-grow: 0;\
  flex-shrink: 0;\
  flex-direction: row;\
  flex-wrap: wrap;\
  align-items: center;\
  height: 32px;\
  margin-top: 16px;\
  margin-bottom: 0px;\
  line-height: 24px;\
  font-size: 17px;\
  font-weight: 600;\
  white-space: pre-wrap;\
}\
\
.outcome-summary-bar .block, .outcome-summary-bar .fail, .outcome-summary-bar .pass, .outcome-summary-bar .inapplicable, .outcome-summary-bar .incomplete {\
  font-family: 'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';\
  line-height: 20px;\
  font-size: 16px;\
  color: var(--neutral-0);\
  padding: 8px 8px 10px 10px;\
  height: 16px;\
  display: flex;\
  align-items: center;\
  margin-right: 4px;\
}\
\
.outcome-summary-bar .count {\
  font-weight: 600;\
}\
\
.outcome-summary-bar .fail {\
  background-color: var(--negative-outcome);\
}\
\
.outcome-summary-bar .fail .check-container {\
  position: relative;\
  width: 16px;\
  height: 16px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 0px solid var(--neutral-0);\
}\
\
.outcome-summary-bar .fail .check-container svg circle {\
  fill: var(--negative-outcome);\
}\
\
.outcome-summary-bar .fail .check-container {\
  bottom: -1px;\
  margin-right: 8px;\
}\
\
.outcome-summary-bar .pass {\
  background-color: var(--positive-outcome);\
}\
\
.outcome-summary-bar .pass .check-container {\
  position: relative;\
  width: 16px;\
  height: 16px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 0px solid var(--neutral-0);\
}\
\
.outcome-summary-bar .pass .check-container svg circle {\
  fill: var(--positive-outcome);\
}\
\
.outcome-summary-bar .pass .check-container {\
  bottom: -1px;\
  margin-right: 8px;\
  margin-left: 4px;\
}\
\
.outcome-summary-bar .inapplicable {\
  background-color: var(--neutral-outcome);\
}\
\
.outcome-summary-bar .inapplicable .check-container {\
  position: relative;\
  width: 16px;\
  height: 16px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 0px solid var(--neutral-0);\
}\
\
.outcome-summary-bar .inapplicable .check-container {\
  bottom: -1px;\
  margin-right: 8px;\
  margin-left: 4px;\
}\
\
.outcome-summary-bar .incomplete {\
  background-color: var(--neutral-outcome);\
  color: var(--white);\
  border: 2px var(--neutral-60) solid;\
  height: 12px;\
}\
\
.outcome-summary-bar .incomplete .check-container {\
  position: relative;\
  width: 8px;\
  height: 8px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 3px solid var(--neutral-0);\
}\
\
.outcome-summary-bar .incomplete .check-container {\
  margin-right: 6px;\
  border-color: var(--white);\
}\
\
.outcome-summary-bar .summary-bar-left-edge {\
  border-top-left-radius: 2px;\
  border-bottom-left-radius: 2px;\
}\
\
.outcome-summary-bar .summary-bar-right-edge {\
  border-top-right-radius: 2px;\
  border-bottom-right-radius: 2px;\
  margin-right: 0px;\
}\
\
.screen-reader-only {\
  position: absolute;\
  left: -10000px;\
  top: auto;\
  width: 1px;\
  height: 1px;\
  overflow: hidden;\
}\
\
.check-container svg {\
  width: 100%;\
  height: 100%;\
}\
\
.outcome-chip {\
  height: 16px;\
  color: var(--primary-text);\
  border-radius: 0px 8px 8px 0px;\
  margin: 0 4px 0 4px;\
  display: inline-flex;\
  align-items: center;\
  margin-bottom: -3px;\
}\
\
.outcome-chip .icon {\
  border-radius: 50%;\
  width: 16px;\
  height: 16px;\
}\
\
.outcome-chip .count {\
  font-family: 'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';\
  line-height: 13px;\
  font-size: 11px;\
  border-radius: 0 8px 8px 0;\
  padding: 0 6px 0 10px;\
  font-weight: 700;\
  margin-left: -8px;\
  height: 13px;\
}\
\
.outcome-chip.outcome-chip-pass .check-container {\
  position: relative;\
  width: 16px;\
  height: 16px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 0px solid var(--neutral-0);\
}\
\
.outcome-chip.outcome-chip-pass .check-container svg circle {\
  fill: var(--positive-outcome);\
}\
\
.outcome-chip.outcome-chip-pass .check-container {\
  background-color: var(--positive-outcome);\
}\
\
.outcome-chip.outcome-chip-pass .count {\
  background-color: transparent;\
  border: 1.5px solid var(--positive-outcome);\
}\
\
.outcome-chip.outcome-chip-incomplete .check-container, .outcome-chip.outcome-chip-review .check-container {\
  position: relative;\
  width: 14px;\
  height: 14px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 1px solid var(--neutral-0);\
}\
\
.outcome-chip.outcome-chip-incomplete .check-container, .outcome-chip.outcome-chip-review .check-container {\
  background-color: var(--neutral-60);\
}\
\
.outcome-chip.outcome-chip-incomplete .count, .outcome-chip.outcome-chip-review .count {\
  background-color: transparent;\
  border: 1.5px solid var(--neutral-60);\
}\
\
.outcome-chip.outcome-chip-fail .check-container {\
  position: relative;\
  width: 16px;\
  height: 16px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 0px solid var(--neutral-0);\
}\
\
.outcome-chip.outcome-chip-fail .check-container svg circle {\
  fill: var(--negative-outcome);\
}\
\
.outcome-chip.outcome-chip-fail .check-container {\
  background-color: var(--negative-outcome);\
}\
\
.outcome-chip.outcome-chip-fail .count {\
  background-color: transparent;\
  border: 1.5px solid var(--negative-outcome);\
}\
\
.outcome-chip.outcome-chip-inapplicable .check-container {\
  position: relative;\
  width: 16px;\
  height: 16px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 0px solid var(--neutral-0);\
}\
\
.outcome-chip.outcome-chip-inapplicable .check-container {\
  background-color: var(--neutral-outcome);\
}\
\
.outcome-chip.outcome-chip-inapplicable .count {\
  background-color: transparent;\
  border: 1.5px solid var(--neutral-outcome);\
}\
\
.outcome-icon-set .outcome-icon {\
  margin-left: 4px;\
  border-radius: 50%;\
}\
\
.outcome-icon-set .outcome-icon-pass .check-container {\
  position: relative;\
  width: 14px;\
  height: 14px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 0px solid var(--neutral-0);\
}\
\
.outcome-icon-set .outcome-icon-pass .check-container svg circle {\
  fill: var(--positive-outcome);\
}\
\
.outcome-icon-set .outcome-icon-incomplete .check-container {\
  position: relative;\
  width: 12px;\
  height: 12px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 1px solid var(--neutral-0);\
}\
\
.outcome-icon-set .outcome-icon-incomplete .check-container {\
  border-color: var(--neutral-60);\
}\
\
.outcome-icon-set .outcome-icon-fail .check-container {\
  position: relative;\
  width: 14px;\
  height: 14px;\
  display: inline-block;\
  border-radius: 50%;\
  border: 0px solid var(--neutral-0);\
}\
\
.outcome-icon-set .outcome-icon-fail .check-container svg circle {\
  fill: var(--negative-outcome);\
}\
\
body {\
  font-size: 14px;\
  margin: auto;\
  background-color: var(--neutral-2);\
  color: black;\
  font-family: 'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';\
}\
\
.outer-container {\
  box-shadow: 0px 1px 0px rgba(0, 0, 0, 0.08);\
}\
\
.outer-container .content-container {\
  max-width: 960px;\
  margin: 0 auto;\
  margin-top: 24px;\
}\
\
.outer-container .content-container h2 {\
  margin: 0px;\
  font-size: 17px;\
  line-height: 24px;\
}\
\
@media only screen and (max-width: 1000px) {\
  .outer-container .content-container {\
    margin: 24px 16px 0 16px;\
  }\
}\
\
.scan-details-section {\
  box-shadow: 0px 0.3px 0.9px rgba(0, 0, 0, 0.108), 0px 1.6px 3.6px rgba(0, 0, 0, 0.132);\
  border-radius: 4px;\
  background-color: var(--neutral-0);\
  padding: 20px;\
}\
\
.scan-details-section .details-section-list {\
  list-style: none;\
  font-size: 14px;\
  line-height: 16px;\
  padding-left: 0px;\
  display: flex;\
  align-items: flex-start;\
  justify-content: center;\
  flex-direction: column;\
}\
\
.scan-details-section h3 {\
  margin: 0px;\
  font-size: 17px;\
  line-height: 24px;\
}\
\
.scan-details-section ul :first-child li {\
  padding-top: 16px;\
}\
\
.scan-details-section li {\
  display: inline-block;\
  padding-top: 12px;\
}\
\
.scan-details-section li .icon {\
  padding-right: 12px;\
  position: relative;\
  top: 3px;\
}\
\
.scan-details-section .text {\
  word-break: break-all;\
}\
\
.scan-details-section .description-text {\
  white-space: pre-wrap;\
}\
\
.scan-details-section .screen-reader-only {\
  position: absolute;\
  left: -10000px;\
  top: auto;\
  width: 1px;\
  height: 1px;\
  overflow: hidden;\
}\
\
.report-footer-container {\
  max-width: 960px;\
  margin: 0 auto;\
  margin-bottom: 68px;\
  margin-top: 24px;\
}\
\
.report-footer-container .report-footer {\
  line-height: 20px;\
  color: var(--secondary-text);\
}\
\
.report-footer-container .report-footer .tool-name-link {\
  color: var(--secondary-text) !important;\
}\
\
@media only screen and (max-width: 1000px) {\
  .report-footer-container {\
    margin: 0px 16px 68px 16px;\
  }\
}\
\
.report-header-bar {\
  display: flex;\
  justify-content: flex-start;\
  align-items: center;\
  flex-wrap: nowrap;\
  background-color: var(--ada-brand-color);\
  height: 40px;\
  width: 100%;\
}\
\
.report-header-bar :global(.header-icon) {\
  flex-shrink: 0;\
  margin-left: 16px;\
  height: 22px;\
  width: 22px;\
}\
\
.report-header-bar .header-text {\
  margin-left: 8px;\
  color: var(--header-bar-title-color);\
  flex-shrink: 1;\
  white-space: nowrap;\
  overflow: hidden;\
  text-overflow: ellipsis;\
  font-family: 'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';\
  font-weight: normal;\
  font-size: 17px;\
  line-height: 24px;\
}\
\
.report-header-command-bar {\
  height: 40px;\
  width: 100%;\
  display: flex;\
  justify-content: end;\
  min-height: fit-content;\
  align-items: center;\
  background-color: var(--neutral-0);\
  box-shadow: 0px 1px 0px rgba(0, 0, 0, 0.08);\
}\
\
.report-header-command-bar .target-page {\
  white-space: nowrap;\
  overflow: hidden;\
  text-overflow: ellipsis;\
  margin: 0px 0px 0px 16px;\
  display: inherit;\
  color: var(--primary-text);\
  font-family: 'Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';\
  font-size: 14px;\
  line-height: 20px;\
  font-weight: normal;\
}\
\
.report-header-command-bar .target-page a {\
  white-space: nowrap;\
  overflow: hidden;\
  text-overflow: ellipsis;\
}\
\
.report-congrats-message {\
  word-break: break-word;\
  overflow-wrap: break-word;\
}\
\
.report-congrats-head {\
  font-size: 16px;\
  font-weight: 600;\
  color: var(--primary-text);\
  padding: 10px 0 10px 0;\
}\
\
.report-congrats-info {\
  font-size: 14px;\
  color: var(--secondary-text);\
  padding: 10px 0 10px 0;\
}\
\
.sleeping-ada {\
  height: 100px;\
}\
\
.title-section h1 {\
  font-family: 'Segoe UI Semibold','Segoe UI Web (West European)','Segoe UI','-apple-system',BlinkMacSystemFont,Roboto,'Helvetica Neue',Helvetica,Ubuntu,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol';\
  margin: 0px 0px 24px 0px;\
  font-size: 21px;\
  line-height: 32px;\
  letter-spacing: -0.02em;\
}\
\
.results-container {\
  margin-top: 56px;\
}\
\
@media screen and (max-width: 640px) {\
  .outcome-past-tense {\
    display: none;\
  }\
}\
\
.summary-section {\
  box-shadow: 0px 0.3px 0.9px rgba(0, 0, 0, 0.108), 0px 1.6px 3.6px rgba(0, 0, 0, 0.132);\
  border-radius: 4px;\
  background-color: var(--neutral-0);\
  padding: 20px;\
  margin-bottom: 24px;\
}\
\
.result-section {\
  padding-bottom: 58px;\
}\
\
.result-section .title-container[aria-level='2'] .collapsible-control::before {\
  position: relative;\
  bottom: 2px;\
  margin-right: 14px;\
}\
\
.collapsible-container:not(.collapsible-rule-details-group) .collapsible-control {\
  padding-left: 2px;\
  padding-right: 16px;\
  position: relative;\
}\
\
.collapsible-container .collapsible-control[aria-expanded='false']:before, .collapsible-container .collapsible-control[aria-expanded='true']:before {\
  display: inline-block;\
  border-right: 1px solid var(--secondary-text);\
  border-bottom: 1px solid var(--secondary-text);\
  min-width: 7px;\
  width: 7px;\
  height: 7px;\
  content: '';\
  transform-origin: 50% 50%;\
  transition: transform 0.1s linear 0s;\
}\
\
.collapsible-container .collapsible-control {\
  font-family: 'Segoe UI Web (West European)', 'Segoe UI', '-apple-system', BlinkMacSystemFont, Roboto, 'Helvetica Neue', Helvetica, Ubuntu, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';\
  background-color: transparent;\
  cursor: pointer;\
  border: none;\
  display: flex;\
  align-items: baseline;\
  width: 100%;\
}\
\
.collapsible-container .collapsible-control:hover {\
  background-color: var(--neutral-alpha-4);\
}\
\
.collapsible-container .collapsible-control[aria-expanded='false']:before {\
  -webkit-transform: rotate(-45deg);\
  -ms-transform: rotate(-45deg);\
  transform: rotate(-45deg);\
}\
\
.collapsible-container .collapsible-control[aria-expanded='true']:before {\
  -webkit-transform: rotate(45deg);\
  -ms-transform: rotate(45deg);\
  transform: rotate(45deg);\
}\
\
.collapsible-container .collapsible-content[aria-hidden='true'] {\
  display: none;\
}\
\
ul.instance-details-list {\
  list-style-type: none;\
  padding-inline-start: unset;\
  margin-block-start: unset;\
  margin-block-end: unset;\
}\
\
ul.instance-details-list li {\
  margin-bottom: 16px;\
}\
\
ul.instance-details-list li:last-child {\
  margin-bottom: unset;\
}\
`;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/inline-image.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/icons/ada/ada-laptop-base64.ts"), __webpack_require__("./src/icons/ada/ada-multicolor-bubbles-base64.ts"), __webpack_require__("./src/icons/ada/sleeping-ada-base64.ts"), __webpack_require__("./src/icons/brand/blue/brand-blue-48px-base64.ts"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, ada_laptop_base64_1, ada_multicolor_bubbles_base64_1, sleeping_ada_base64_1, brand_blue_48px_base64_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InlineImage = exports.InlineImageType = void 0;
    var InlineImageType;
    (function (InlineImageType) {
        InlineImageType[InlineImageType["InsightsLogo48"] = 0] = "InsightsLogo48";
        InlineImageType[InlineImageType["AdaTheCat"] = 1] = "AdaTheCat";
        InlineImageType[InlineImageType["FailIcon"] = 2] = "FailIcon";
        InlineImageType[InlineImageType["PassIcon"] = 3] = "PassIcon";
        InlineImageType[InlineImageType["NotApplicableIcon"] = 4] = "NotApplicableIcon";
        InlineImageType[InlineImageType["AdaLaptop"] = 5] = "AdaLaptop";
        InlineImageType[InlineImageType["SleepingAda"] = 6] = "SleepingAda";
    })(InlineImageType = exports.InlineImageType || (exports.InlineImageType = {}));
    const inlineImageTypeToData = {
        [InlineImageType.AdaTheCat]: ada_multicolor_bubbles_base64_1.adaMulticolorBubbles,
        [InlineImageType.AdaLaptop]: ada_laptop_base64_1.adaLaptop,
        [InlineImageType.SleepingAda]: sleeping_ada_base64_1.sleepingAda,
        [InlineImageType.InsightsLogo48]: brand_blue_48px_base64_1.blue48,
        [InlineImageType.FailIcon]: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAEgSURBVHgBjVO7UcNAFFwdGZFLcAeIChAdEOIIqwJDB1ABUIGVACHqAFwB7oArQY48DvzZlU+e55M09pvR6P12309K0CNfwPACGKyBagT4rpzEGlMmXwKTLfBIc2BCApf0v1uiA/gDSFnpm+oQ/eJJcNsQJE2LVH5OAFsELjheI6CPAJXRVWgqxaldGncmWIjZEKjSNZ/S5GTsNnOcM4uqjNnOTSD41Vt2VEDzpo7BNAKDvkKAewIVl422XAlcdQT8BpiFRc7RcWfGF861A960+m9GOMrjuH9u2W6pDIDCjoDjhanyrL7zJ/DGhAnOl4L7yOs7r4Bn9Hy/HeLZ7ZOUGpxzac1pTgDr0+VhyUkc5YbHdD5gf0L9HEqcE/Qyish3OPNZtBL6xXIAAAAASUVORK5CYII=',
        [InlineImageType.PassIcon]: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAEjSURBVHgBjZPdTcMwFIWPLcoLEvIIZQIyApmAEYAJGl5RJYIEz6QT0A3oBmSDdoRswOWBFxoo59rFClF+eqUo1/b9jk98HYOecLmb4gsOxxDJpeqqMS3AocaMaabDuLCDwitMsGgKRdjduYSjVz5T9IWKTJD+CZhocYu3QbBDwPqJGs+jYLAOX1fjxafcNeFgPQJu8IkUJygIX+3nUku7FweBp7iMYIhEbScta4tO8AfLf6IW55Zq0phayaNkhB4GQY1vfNh4EBoGmZu7e3mSfBAMtWuzvxjvraWctqpeUGOLs9DnuSv4muHQ2GFJdzehz0fcqWl/GKz4Sbeaepi3RWg9ZVqOoKXWSSH+kE17lXf8mpLaT22h/hxauNEO0GrZrP0Fh/l0dPtaE5UAAAAASUVORK5CYII=',
        [InlineImageType.NotApplicableIcon]: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAEOSURBVHgBrVI7boNAEJ1dXKQkN+AIiYA6rbukTeVUCKqQE0R0KV0CVdylTJkuKVOAlCNwBNIgWeLjN3hXQrItQPaT3u7ssG9nnhhBA4RhaFZV9YzwCbRU+k8IwYziOC6G94UOgiBY1XW9xiWTjqMEozRN1zph8OJ53kPXdR8QXtFp8Lelbdv/eZ7/9pV937fatv0etDmGUkp5yxZk0zThDCHDVBqSaPWOZgKae94X4I3KFeBmRLeifZdWX5nOwEJVtBRfJ+oKXXms1QPA808vBt7xj8uZ4oh3I8uy0nGcLeLlRG2UJMlnL+aFJ4YnZ8IDLxjPN30wdMAPuK67gYVrHE1FYkuwloCPqPhFl8IO01xYOdncfcYAAAAASUVORK5CYII=',
    };
    exports.InlineImage = named_fc_1.NamedFC('InlineImage', ({ imageType, alt, className }) => {
        const imageData = inlineImageTypeToData[imageType];
        if (imageData === undefined) {
            return null;
        }
        return React.createElement("img", { className: className, src: imageData, alt: alt });
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/instance-details.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"instanceDetailsCard":"instance-details-card--OrpLo","instanceDetailsCardContainer":"instance-details-card-container--_ELdq","selected":"selected--3O8dW","reportInstanceTable":"report-instance-table--ljlFi","row":"row--kaG63","label":"label--2oToo","instanceListRowContent":"instance-list-row-content--2vx_t","contentSnipppet":"content-snipppet--3_Pd3"};

/***/ }),

/***/ "./src/reports/components/new-tab-link-confirmation-dialog.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/new-tab-link.tsx"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("office-ui-fabric-react"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, new_tab_link_1, named_fc_1, office_ui_fabric_react_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NewTabLinkWithConfirmationDialog = void 0;
    exports.NewTabLinkWithConfirmationDialog = named_fc_1.NamedFC('NewTabLinkWithConfirmationDialog', props => {
        const id = office_ui_fabric_react_1.getId('new-tab-link-with-confirmation-dialog__'); // generates something like new-tab-link-with-confirmation-dialog__123
        return (React.createElement(React.Fragment, null,
            React.createElement(new_tab_link_1.NewTabLink, Object.assign({}, props, { id: id })),
            React.createElement("script", { dangerouslySetInnerHTML: {
                    __html: generateScriptToAddConfirmOnClickHandler(id),
                } })));
    });
    // Note: the source of this function's body is stringified and injected into the report.
    //
    // The use of function() {} syntax over arrow functions is important for IE compat (see #1875).
    //
    // The "istanbul ignore next" excludes the function from code coverage to prevent code cov from
    // injecting functions that interfere with eval in the unit tests.
    //
    /* istanbul ignore next */
    const addConfirmOnClickHandler = function (linkId, doc, confirmCallback) {
        const targetPageLink = doc.getElementById(linkId);
        targetPageLink.addEventListener('click', function (event) {
            const result = confirmCallback('Are you sure you want to navigate away from the Accessibility Insights report?\n' +
                'This link will open the target page in a new tab.\n\nPress OK to continue or ' +
                'Cancel to stay on the current page.');
            if (result === false) {
                event.preventDefault();
            }
        });
    };
    const generateScriptToAddConfirmOnClickHandler = (linkId) => `(${String(addConfirmOnClickHandler)})(${JSON.stringify(linkId)}, document, confirm);`;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/outcome-chip.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/outcome-icon.tsx"), __webpack_require__("./src/reports/components/outcome-type.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, outcome_icon_1, outcome_type_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OutcomeChip = exports.failureCountAutomationId = void 0;
    exports.failureCountAutomationId = 'count';
    exports.OutcomeChip = named_fc_1.NamedFC('OutcomeChip', props => {
        const { outcomeType, count } = props;
        const { pastTense } = outcome_type_1.outcomeTypeSemantics[outcomeType];
        const text = `${count} ${pastTense}`;
        return (React.createElement("span", { className: 'outcome-chip outcome-chip-' + outcomeType, title: text },
            React.createElement("span", { className: "icon" },
                React.createElement(outcome_icon_1.OutcomeIcon, { outcomeType: outcomeType })),
            React.createElement("span", { "data-automation-id": exports.failureCountAutomationId, className: "count", "aria-hidden": "true" },
                ' ',
                count),
            React.createElement("span", { className: "screen-reader-only" }, text)));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/outcome-icon.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/reports/components/outcome-type.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, outcome_type_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OutcomeIcon = void 0;
    exports.OutcomeIcon = named_fc_1.NamedFC('OutcomeIcon', props => outcome_type_1.outcomeIconMap[props.outcomeType]);
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/outcome-summary-bar.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("classnames"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/reports/components/outcome-type.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, classNames, named_fc_1, lodash_1, React, outcome_type_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OutcomeSummaryBar = void 0;
    exports.OutcomeSummaryBar = named_fc_1.NamedFC('OutcomeSummaryBar', props => {
        const outcomeTypesCount = props.allOutcomeTypes.length;
        const getClassNames = (outcomeType, index) => {
            return classNames({
                [lodash_1.kebabCase(outcomeType)]: true,
                'summary-bar-left-edge': index === 0,
                'summary-bar-right-edge': index === outcomeTypesCount - 1,
            });
        };
        const getLabel = () => {
            const { allOutcomeTypes, outcomeStats } = props;
            const countSuffix = props.countSuffix || '';
            return allOutcomeTypes
                .map(outcomeType => {
                const count = outcomeStats[outcomeType];
                const outcomePastTense = outcome_type_1.outcomeTypeSemantics[outcomeType].pastTense;
                return `${count}${countSuffix} ${outcomePastTense}`;
            })
                .join(', ');
        };
        return (React.createElement("div", { className: "outcome-summary-bar", "aria-label": getLabel(), role: "img" }, props.allOutcomeTypes.map((outcomeType, index) => {
            const { iconStyleInverted, countSuffix } = props;
            const iconMap = iconStyleInverted === true ? outcome_type_1.outcomeIconMapInverted : outcome_type_1.outcomeIconMap;
            const outcomeIcon = iconMap[outcomeType];
            const count = props.outcomeStats[outcomeType];
            return (React.createElement("div", { key: outcomeType, style: { flexGrow: count } },
                React.createElement("span", { className: getClassNames(outcomeType, index) },
                    React.createElement("span", { "aria-hidden": "true" }, outcomeIcon),
                    count,
                    countSuffix)));
        })));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/outcome-type.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/icons/check-icon.tsx"), __webpack_require__("./src/common/icons/circle-icon.tsx"), __webpack_require__("./src/common/icons/cross-icon.tsx"), __webpack_require__("./src/common/icons/inapplicable-icon.tsx"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, check_icon_1, circle_icon_1, cross_icon_1, inapplicable_icon_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.outcomeIconMapInverted = exports.outcomeIconMap = exports.outcomeTypeSemantics = void 0;
    exports.outcomeTypeSemantics = {
        pass: { pastTense: 'Passed' },
        incomplete: { pastTense: 'Incomplete' },
        fail: { pastTense: 'Failed' },
        inapplicable: { pastTense: 'Not applicable' },
        review: { pastTense: 'Needs review' },
    };
    exports.outcomeIconMap = {
        pass: React.createElement(check_icon_1.CheckIcon, null),
        incomplete: React.createElement(circle_icon_1.CircleIcon, null),
        fail: React.createElement(cross_icon_1.CrossIcon, null),
        inapplicable: React.createElement(inapplicable_icon_1.InapplicableIcon, null),
        review: React.createElement(circle_icon_1.CircleIcon, null),
    };
    exports.outcomeIconMapInverted = {
        pass: React.createElement(check_icon_1.CheckIconInverted, null),
        incomplete: React.createElement(circle_icon_1.CircleIcon, null),
        fail: React.createElement(cross_icon_1.CrossIconInverted, null),
        inapplicable: React.createElement(inapplicable_icon_1.InapplicableIconInverted, null),
        review: React.createElement(circle_icon_1.CircleIcon, null),
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-head.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/content/strings/application.ts"), __webpack_require__("react"), __webpack_require__("./src/DetailsView/bundled-details-view-styles.ts"), __webpack_require__("./src/reports/automated-checks-report.styles.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, application_1, React, bundledStyles, reportStyles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReportHead = void 0;
    exports.ReportHead = named_fc_1.NamedFC('ReportHead', () => {
        // tslint:disable: react-no-dangerous-html
        return (React.createElement("head", null,
            React.createElement("meta", { charSet: "UTF-8" }),
            React.createElement("title", null,
                application_1.title,
                " automated checks result"),
            React.createElement("style", { dangerouslySetInnerHTML: { __html: reportStyles.styleSheet } }),
            React.createElement("style", { dangerouslySetInnerHTML: { __html: bundledStyles.styleSheet } })));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/automated-checks-header-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/report-sections/header-section.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, header_section_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AutomatedChecksHeaderSection = void 0;
    exports.AutomatedChecksHeaderSection = named_fc_1.NamedFC('AutomatedChecksHeaderSection', ({ scanMetadata }) => {
        return React.createElement(header_section_1.HeaderSection, { targetAppInfo: scanMetadata.targetAppInfo });
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/automated-checks-report-section-factory.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/failed-instances-section.tsx"), __webpack_require__("./src/reports/components/report-head.tsx"), __webpack_require__("./src/reports/components/report-sections/automated-checks-header-section.tsx"), __webpack_require__("./src/reports/components/report-sections/body-section.tsx"), __webpack_require__("./src/reports/components/report-sections/content-container.tsx"), __webpack_require__("./src/reports/components/report-sections/details-section.tsx"), __webpack_require__("./src/reports/components/report-sections/footer-text.tsx"), __webpack_require__("./src/reports/components/report-sections/not-applicable-checks-section.tsx"), __webpack_require__("./src/reports/components/report-sections/passed-checks-section.tsx"), __webpack_require__("./src/reports/components/report-sections/report-footer.tsx"), __webpack_require__("./src/reports/components/report-sections/results-container.tsx"), __webpack_require__("./src/reports/components/report-sections/summary-section.tsx"), __webpack_require__("./src/reports/components/report-sections/title-section.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, failed_instances_section_1, report_head_1, automated_checks_header_section_1, body_section_1, content_container_1, details_section_1, footer_text_1, not_applicable_checks_section_1, passed_checks_section_1, report_footer_1, results_container_1, summary_section_1, title_section_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AutomatedChecksReportSectionFactory = void 0;
    exports.AutomatedChecksReportSectionFactory = {
        HeadSection: report_head_1.ReportHead,
        BodySection: body_section_1.BodySection,
        ContentContainer: content_container_1.ContentContainer,
        HeaderSection: automated_checks_header_section_1.AutomatedChecksHeaderSection,
        TitleSection: title_section_1.TitleSection,
        SummarySection: summary_section_1.AllOutcomesSummarySection,
        DetailsSection: details_section_1.DetailsSection,
        ResultsContainer: results_container_1.ResultsContainer,
        FailedInstancesSection: failed_instances_section_1.FailedInstancesSection,
        PassedChecksSection: passed_checks_section_1.PassedChecksSection,
        NotApplicableChecksSection: not_applicable_checks_section_1.NotApplicableChecksSection,
        FooterSection: report_footer_1.ReportFooter,
        FooterText: footer_text_1.FooterText,
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/body-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BodySection = void 0;
    exports.BodySection = named_fc_1.NamedFC('BodySection', ({ children }) => {
        return React.createElement("body", null, children);
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/collapsible-result-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/result-section-title.tsx"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/report-sections/rules-only.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, result_section_title_1, named_fc_1, React, rules_only_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CollapsibleResultSection = void 0;
    exports.CollapsibleResultSection = named_fc_1.NamedFC('CollapsibleResultSection', props => {
        const { containerClassName, containerId, deps } = props;
        const CollapsibleContent = deps.collapsibleControl({
            id: containerId,
            header: React.createElement(result_section_title_1.ResultSectionTitle, Object.assign({}, props)),
            content: React.createElement(rules_only_1.RulesOnly, Object.assign({}, props)),
            headingLevel: 2,
            deps: null,
        });
        return React.createElement("div", { className: containerClassName }, CollapsibleContent);
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/collapsible-script-provider.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getDefaultAddListenerForCollapsibleSection = exports.getAddListenerForCollapsibleSection = exports.addEventListenerForCollapsibleSection = void 0;
    // Note: the source of this function's body is stringified and injected into the report.
    //
    // The use of function() {} syntax over arrow functions is important for IE compat (see #1875).
    //
    // The "istanbul ignore next" excludes the function from code coverage to prevent code cov from
    // injecting functions that interfere with eval in the unit tests.
    //
    /* istanbul ignore next */
    exports.addEventListenerForCollapsibleSection = function (doc) {
        const collapsibles = doc.getElementsByClassName('collapsible-container');
        for (let index = 0; index < collapsibles.length; index++) {
            const container = collapsibles.item(index);
            const button = container === null || container === void 0 ? void 0 : container.querySelector('.collapsible-control');
            if (button == null) {
                continue;
            }
            button.addEventListener('click', function () {
                var _a;
                const content = (_a = button.parentElement) === null || _a === void 0 ? void 0 : _a.nextElementSibling;
                if (content == null) {
                    throw Error(`Expected button element's parent to have a next sibling`);
                }
                const wasExpandedBefore = button.getAttribute('aria-expanded') === 'false' ? false : true;
                const isExpandedAfter = !wasExpandedBefore;
                button.setAttribute('aria-expanded', isExpandedAfter + '');
                content.setAttribute('aria-hidden', !isExpandedAfter + '');
                if (isExpandedAfter) {
                    container.classList.remove('collapsed');
                }
                else {
                    container.classList.add('collapsed');
                }
            });
        }
    };
    exports.getAddListenerForCollapsibleSection = (code) => `(${String(code)})(document)`;
    exports.getDefaultAddListenerForCollapsibleSection = () => exports.getAddListenerForCollapsibleSection(exports.addEventListenerForCollapsibleSection);
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/content-container.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ContentContainer = void 0;
    exports.ContentContainer = named_fc_1.NamedFC('ContentSection', ({ children }) => {
        return (React.createElement("main", { className: "outer-container" },
            React.createElement("div", { className: "content-container" }, children)));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/details-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/reports/components/new-tab-link-confirmation-dialog.tsx"), __webpack_require__("./src/reports/components/report-sections/make-details-section-fc.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, new_tab_link_confirmation_dialog_1, make_details_section_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DetailsSection = exports.getUrlItemInfo = void 0;
    function getUrlItemInfo(scanMetadata) {
        return {
            label: 'target page url:',
            content: (React.createElement(new_tab_link_confirmation_dialog_1.NewTabLinkWithConfirmationDialog, { href: scanMetadata.targetAppInfo.url, title: scanMetadata.targetAppInfo.name }, scanMetadata.targetAppInfo.url)),
        };
    }
    exports.getUrlItemInfo = getUrlItemInfo;
    exports.DetailsSection = make_details_section_fc_1.makeDetailsSectionFC(getUrlItemInfo);
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/footer-text.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/report-sections/tool-link.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, tool_link_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FooterText = void 0;
    exports.FooterText = named_fc_1.NamedFC('FooterText', ({ scanMetadata }) => {
        const { applicationProperties, scanEngineProperties } = scanMetadata.toolData;
        return (React.createElement(React.Fragment, null,
            "This automated checks result was generated using",
            ' ',
            `${applicationProperties.name} ${applicationProperties.version} (axe-core ${scanEngineProperties.version})`,
            ", a tool that helps debug and find accessibility issues earlier on",
            ' ',
            applicationProperties.environmentName,
            ". Get more information & download this tool at",
            ' ',
            React.createElement(tool_link_1.ToolLink, null),
            "."));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/full-rule-header.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/guidance-links.tsx"), __webpack_require__("./src/common/components/guidance-tags.tsx"), __webpack_require__("./src/common/components/new-tab-link.tsx"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/reports/components/outcome-chip.tsx"), __webpack_require__("./src/reports/components/outcome-type.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, guidance_links_1, guidance_tags_1, new_tab_link_1, named_fc_1, lodash_1, React, outcome_chip_1, outcome_type_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FullRuleHeader = void 0;
    exports.FullRuleHeader = named_fc_1.NamedFC('FullRuleHeader', props => {
        const { outcomeType, deps, cardRuleResult: cardResult } = props;
        const outcomeText = outcome_type_1.outcomeTypeSemantics[props.outcomeType].pastTense;
        const ariaDescribedBy = `${lodash_1.kebabCase(outcomeText)}-rule-${cardResult.id}-description`;
        const renderCountBadge = () => {
            if (outcomeType !== 'fail') {
                return null;
            }
            return (React.createElement("span", { "aria-hidden": "true" },
                React.createElement(outcome_chip_1.OutcomeChip, { count: cardResult.nodes.length, outcomeType: outcomeType })));
        };
        const renderRuleLink = () => {
            const ruleId = cardResult.id;
            const ruleUrl = cardResult.url;
            const displayedRule = ruleUrl ? (React.createElement(new_tab_link_1.NewTabLink, { href: ruleUrl, "aria-label": `rule ${ruleId}`, "aria-describedby": ariaDescribedBy }, ruleId)) : (React.createElement(React.Fragment, null, ruleId));
            return React.createElement("span", { className: "rule-details-id" }, displayedRule);
        };
        const renderGuidanceLinks = () => {
            if (lodash_1.isEmpty(cardResult.guidance)) {
                return null;
            }
            return (React.createElement(React.Fragment, null,
                "(",
                React.createElement(guidance_links_1.GuidanceLinks, { links: cardResult.guidance, LinkComponent: deps.LinkComponent }),
                ")"));
        };
        const renderDescription = () => {
            return (React.createElement("span", { className: "rule-details-description", id: ariaDescribedBy }, cardResult.description));
        };
        const renderGuidanceTags = () => {
            return React.createElement(guidance_tags_1.GuidanceTags, { deps: deps, links: cardResult.guidance });
        };
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: "rule-detail" },
                React.createElement("div", null,
                    renderCountBadge(),
                    " ",
                    renderRuleLink(),
                    ": ",
                    renderDescription(),
                    renderGuidanceLinks(),
                    renderGuidanceTags()))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/header-section.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"reportHeaderBar":"report-header-bar--3yeP8","headerText":"header-text--2Ht6R","reportHeaderCommandBar":"report-header-command-bar--CWe48","targetPage":"target-page--16UqC"};

/***/ }),

/***/ "./src/reports/components/report-sections/header-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/content/strings/application.ts"), __webpack_require__("./src/icons/brand/white/brand-white.tsx"), __webpack_require__("react"), __webpack_require__("./src/reports/components/new-tab-link-confirmation-dialog.tsx"), __webpack_require__("./src/reports/components/report-sections/header-section.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, application_1, brand_white_1, React, new_tab_link_confirmation_dialog_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HeaderSection = void 0;
    exports.HeaderSection = named_fc_1.NamedFC('HeaderSection', ({ targetAppInfo }) => {
        return (React.createElement("header", null,
            React.createElement("div", { className: styles.reportHeaderBar },
                React.createElement(brand_white_1.BrandWhite, null),
                React.createElement("div", { className: styles.headerText }, application_1.productName)),
            React.createElement("div", { className: styles.reportHeaderCommandBar },
                React.createElement("div", { className: styles.targetPage },
                    "Target page:\u00A0",
                    React.createElement(new_tab_link_confirmation_dialog_1.NewTabLinkWithConfirmationDialog, { href: targetAppInfo.url, title: targetAppInfo.name }, targetAppInfo.name)))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/make-details-section-fc.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("@uifabric/utilities"), __webpack_require__("./src/common/icons/comment-icon.tsx"), __webpack_require__("./src/common/icons/date-icon.tsx"), __webpack_require__("./src/common/icons/url-icon.tsx"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("lodash"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, utilities_1, comment_icon_1, date_icon_1, url_icon_1, named_fc_1, lodash_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.makeDetailsSectionFC = void 0;
    function makeDetailsSectionFC(getDisplayedScanTargetInfo) {
        return named_fc_1.NamedFC('DetailsSection', props => {
            const { scanMetadata, description, scanDate, toUtcString } = props;
            const createListItem = (icon, label, content, contentClassName) => (React.createElement("li", null,
                React.createElement("span", { className: "icon", "aria-hidden": "true" }, icon),
                React.createElement("span", { className: "screen-reader-only" }, label),
                React.createElement("span", { className: utilities_1.css('text', contentClassName) }, content)));
            const scanDateUTC = toUtcString(scanDate);
            const showCommentRow = !lodash_1.isEmpty(description);
            const displayedScanTargetInfo = getDisplayedScanTargetInfo(scanMetadata);
            return (React.createElement("div", { className: "scan-details-section" },
                React.createElement("h2", null, "Scan details"),
                React.createElement("ul", { className: "details-section-list" },
                    createListItem(React.createElement(url_icon_1.UrlIcon, null), displayedScanTargetInfo.label, displayedScanTargetInfo.content),
                    createListItem(React.createElement(date_icon_1.DateIcon, null), 'scan date:', scanDateUTC),
                    showCommentRow &&
                        createListItem(React.createElement(comment_icon_1.CommentIcon, null), 'comment:', description, 'description-text'))));
        });
    }
    exports.makeDetailsSectionFC = makeDetailsSectionFC;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/minimal-rule-header.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"outcomeChipContainer":"outcome-chip-container--3NUUD"};

/***/ }),

/***/ "./src/reports/components/report-sections/minimal-rule-header.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/report-sections/minimal-rule-header.scss"), __webpack_require__("./src/reports/components/outcome-chip.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, minimal_rule_header_scss_1, outcome_chip_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MinimalRuleHeader = exports.ruleDetailAutomationId = exports.cardsRuleIdAutomationId = void 0;
    exports.cardsRuleIdAutomationId = 'cards-rule-id';
    exports.ruleDetailAutomationId = 'rule-detail';
    exports.MinimalRuleHeader = named_fc_1.NamedFC('MinimalRuleHeader', props => {
        const { outcomeType, rule } = props;
        const renderCountBadge = () => {
            if (outcomeType !== 'fail' && outcomeType !== 'review') {
                return null;
            }
            return (React.createElement("span", { "aria-hidden": "true" },
                React.createElement(outcome_chip_1.OutcomeChip, { count: rule.nodes.length, outcomeType: outcomeType })));
        };
        const renderRuleName = () => (React.createElement("span", { "data-automation-id": exports.cardsRuleIdAutomationId, className: "rule-details-id" }, rule.id));
        const renderDescription = () => (React.createElement("span", { className: "rule-details-description" }, rule.description));
        return (React.createElement("span", { "data-automation-id": exports.ruleDetailAutomationId, className: "rule-detail" },
            React.createElement("span", { className: minimal_rule_header_scss_1.outcomeChipContainer }, renderCountBadge()),
            React.createElement("span", null,
                renderRuleName(),
                ": ",
                renderDescription())));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/no-failed-instances-congrats.scss":
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin
module.exports = {"reportCongratsMessage":"report-congrats-message--1O-Tl","reportCongratsHead":"report-congrats-head--6pvch","reportCongratsInfo":"report-congrats-info--pvbRt","sleepingAda":"sleeping-ada--3M6Q7"};

/***/ }),

/***/ "./src/reports/components/report-sections/no-failed-instances-congrats.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/inline-image.tsx"), __webpack_require__("./src/reports/components/report-sections/no-failed-instances-congrats.scss")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, inline_image_1, styles) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoFailedInstancesCongrats = void 0;
    exports.NoFailedInstancesCongrats = named_fc_1.NamedFC('NoFailedInstancesCongrats', props => {
        var _a;
        const messageSubject = props.outcomeType === 'review' ? 'instances to review' : 'failed automated checks';
        const message = (_a = props.deps.customCongratsMessage) !== null && _a !== void 0 ? _a : `No ${messageSubject} were found. Continue investigating your website's accessibility compliance through manual testing using Tab stops and Assessment in Accessibility Insights for Web.`;
        return (React.createElement("div", { className: styles.reportCongratsMessage },
            React.createElement("div", { className: styles.reportCongratsHead }, "Congratulations!"),
            React.createElement("div", { className: styles.reportCongratsInfo }, message),
            React.createElement(inline_image_1.InlineImage, { className: styles.sleepingAda, imageType: inline_image_1.InlineImageType.SleepingAda, alt: "" })));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/not-applicable-checks-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/reports/components/report-sections/collapsible-result-section.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1, collapsible_result_section_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NotApplicableChecksSection = void 0;
    exports.NotApplicableChecksSection = named_fc_1.NamedFC('NotApplicableChecksSection', ({ deps, cardsViewData }) => {
        const cardRuleResults = cardsViewData.cards.inapplicable;
        return (React.createElement(collapsible_result_section_1.CollapsibleResultSection, { deps: deps, title: "Not applicable checks", cardRuleResults: cardRuleResults, containerClassName: "result-section", outcomeType: "inapplicable", badgeCount: cardRuleResults.length, containerId: "not-applicable-checks-section" }));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/passed-checks-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/report-sections/collapsible-result-section.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React, collapsible_result_section_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PassedChecksSection = void 0;
    exports.PassedChecksSection = named_fc_1.NamedFC('PassedChecksSection', ({ deps, cardsViewData }) => {
        const cardRuleResults = cardsViewData.cards.pass;
        return (React.createElement(collapsible_result_section_1.CollapsibleResultSection, { deps: deps, title: "Passed checks", cardRuleResults: cardRuleResults, containerClassName: "result-section", outcomeType: "pass", badgeCount: cardRuleResults.length, containerId: "passed-checks-section" }));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/report-body.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReportBody = void 0;
    exports.ReportBody = named_fc_1.NamedFC('ReportBody', props => {
        const { sectionFactory } = props, sectionProps = __rest(props, ["sectionFactory"]);
        const { BodySection, ContentContainer, HeaderSection, TitleSection, SummarySection, DetailsSection, ResultsContainer, FailedInstancesSection, PassedChecksSection, NotApplicableChecksSection, FooterSection, FooterText, } = sectionFactory;
        return (React.createElement(BodySection, null,
            React.createElement(HeaderSection, Object.assign({}, sectionProps)),
            React.createElement(ContentContainer, null,
                React.createElement(TitleSection, null),
                React.createElement(SummarySection, Object.assign({}, sectionProps)),
                React.createElement(DetailsSection, Object.assign({}, sectionProps)),
                React.createElement(ResultsContainer, Object.assign({}, sectionProps),
                    React.createElement(FailedInstancesSection, Object.assign({}, sectionProps)),
                    React.createElement(PassedChecksSection, Object.assign({}, sectionProps)),
                    React.createElement(NotApplicableChecksSection, Object.assign({}, sectionProps)))),
            React.createElement(FooterSection, null,
                React.createElement(FooterText, Object.assign({}, sectionProps)))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/report-collapsible-container.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("@uifabric/utilities"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, utilities_1, named_fc_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReportCollapsibleContainerControl = void 0;
    const ReportCollapsibleContainer = named_fc_1.NamedFC('ReportCollapsibleContainer', props => {
        const { id, header, headingLevel, content, containerClassName, buttonAriaLabel } = props;
        const contentId = `content-container-${id}`;
        const outerDivClassName = utilities_1.css('collapsible-container', containerClassName, 'collapsed');
        return (React.createElement("div", { className: outerDivClassName },
            React.createElement("div", { className: "title-container", role: "heading", "aria-level": headingLevel },
                React.createElement("button", { className: "collapsible-control", "aria-expanded": "false", "aria-controls": contentId, "aria-label": buttonAriaLabel }, header)),
            React.createElement("div", { id: contentId, className: "collapsible-content", "aria-hidden": "true" }, content)));
    });
    exports.ReportCollapsibleContainerControl = (collapsibleControlProps) => React.createElement(ReportCollapsibleContainer, Object.assign({}, collapsibleControlProps));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/report-footer.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReportFooter = void 0;
    exports.ReportFooter = named_fc_1.NamedFC('ReportFooter', ({ children }) => {
        return (React.createElement("div", { className: "report-footer-container" },
            React.createElement("div", { className: "report-footer", role: "contentinfo" }, children)));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/results-container.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResultsContainer = void 0;
    exports.ResultsContainer = named_fc_1.NamedFC('ResultsContainer', ({ children, getCollapsibleScript }) => {
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: "results-container" }, children),
            React.createElement("script", { dangerouslySetInnerHTML: { __html: getCollapsibleScript() } })));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/rules-only.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/rules-with-instances.scss"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react"), __webpack_require__("./src/reports/components/report-sections/full-rule-header.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, styles, named_fc_1, React, full_rule_header_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RulesOnly = void 0;
    exports.RulesOnly = named_fc_1.NamedFC('RulesOnly', ({ outcomeType, deps, cardRuleResults: cardResults }) => {
        return (React.createElement("div", { className: styles.ruleDetailsGroup }, cardResults.map(cardRuleResult => (React.createElement(full_rule_header_1.FullRuleHeader, { deps: deps, key: cardRuleResult.id, cardRuleResult: cardRuleResult, outcomeType: outcomeType })))));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/summary-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/reports/components/outcome-summary-bar.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1, outcome_summary_bar_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PassFailSummarySection = exports.AllOutcomesSummarySection = exports.BaseSummarySection = void 0;
    exports.BaseSummarySection = named_fc_1.NamedFC('BaseSummarySection', props => {
        const { cards } = props.cardsViewData;
        const countSummary = {
            fail: cards.fail.reduce((total, currentFail) => {
                return total + currentFail.nodes.length;
            }, 0),
            pass: cards.pass.length,
            inapplicable: cards.inapplicable.length,
            review: 0,
        };
        return (React.createElement("div", { className: "summary-section" },
            React.createElement("h2", null, "Summary"),
            React.createElement(outcome_summary_bar_1.OutcomeSummaryBar, { outcomeStats: countSummary, iconStyleInverted: true, allOutcomeTypes: props.outcomeTypesShown })));
    });
    exports.AllOutcomesSummarySection = named_fc_1.NamedFC('AllOutcomesSummarySection', props => {
        return (React.createElement(exports.BaseSummarySection, Object.assign({}, props, { outcomeTypesShown: ['fail', 'pass', 'inapplicable'] })));
    });
    exports.PassFailSummarySection = named_fc_1.NamedFC('PassFailSummarySection', props => {
        return React.createElement(exports.BaseSummarySection, Object.assign({}, props, { outcomeTypesShown: ['fail', 'pass'] }));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/title-section.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("react")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, named_fc_1, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TitleSection = void 0;
    exports.TitleSection = named_fc_1.NamedFC('TitleSection', () => {
        return (React.createElement("div", { className: "title-section" },
            React.createElement("h1", null, "Automated checks results")));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/components/report-sections/tool-link.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/components/new-tab-link.tsx"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/content/strings/application.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, new_tab_link_1, named_fc_1, application_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ToolLink = void 0;
    exports.ToolLink = named_fc_1.NamedFC('ToolLink', () => (React.createElement(new_tab_link_1.NewTabLink, { className: 'tool-name-link', href: "http://aka.ms/AccessibilityInsights", title: `Get more information and download ${application_1.toolName}` }, "http://aka.ms/AccessibilityInsights")));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/package/axe-results-report.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AxeResultsReport = void 0;
    class AxeResultsReport {
        constructor(deps, parameters, toolInfo) {
            this.deps = deps;
            this.parameters = parameters;
            this.toolInfo = toolInfo;
        }
        asHTML() {
            const { resultDecorator, getUnifiedRules, getUnifiedResults, getCards, reportHtmlGenerator } = this.deps;
            const { results, description, scanContext: { pageTitle } } = this.parameters;
            const scanDate = new Date(results.timestamp);
            const scanResults = resultDecorator.decorateResults(results);
            const unifiedRules = getUnifiedRules(scanResults);
            const unifiedResults = getUnifiedResults(scanResults);
            const cardSelectionViewData = {
                selectedResultUids: [],
                expandedRuleIds: [],
                visualHelperEnabled: false,
                resultsHighlightStatus: {},
            };
            const cardsViewModel = getCards(unifiedRules, unifiedResults, cardSelectionViewData);
            const targetAppInfo = {
                name: pageTitle,
                url: results.url,
            };
            const scanMetadata = {
                targetAppInfo: targetAppInfo,
                toolData: this.toolInfo,
                timestamp: null,
            };
            const html = reportHtmlGenerator.generateHtml(scanDate, description, cardsViewModel, scanMetadata);
            return html;
        }
    }
    exports.AxeResultsReport = AxeResultsReport;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/package/footer-text-for-service.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/reports/components/report-sections/tool-link.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, named_fc_1, tool_link_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FooterTextForService = void 0;
    exports.FooterTextForService = named_fc_1.NamedFC('FooterTextForService', ({ scanMetadata }) => {
        const toolData = scanMetadata.toolData;
        return (React.createElement(React.Fragment, null,
            "This automated checks result was generated using the ",
            toolData.applicationProperties.name,
            ' ',
            "that helps find some of the most common accessibility issues. The scan was performed using ",
            toolData.scanEngineProperties.name,
            " ",
            toolData.scanEngineProperties.version,
            " and ",
            toolData.applicationProperties.environmentName,
            ". For a complete WCAG 2.1 compliance assessment please visit",
            ' ',
            React.createElement(tool_link_1.ToolLink, null),
            "."));
    });
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/package/reporter-factory.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/application-properties-provider.ts"), __webpack_require__("./src/common/rule-based-view-model-provider.ts"), __webpack_require__("./src/common/uid-generator.ts"), __webpack_require__("./src/injected/adapters/resolution-creator.ts"), __webpack_require__("./src/injected/adapters/scan-results-to-unified-results.ts"), __webpack_require__("./src/injected/adapters/scan-results-to-unified-rules.ts"), __webpack_require__("./src/reports/components/report-sections/automated-checks-report-section-factory.tsx"), __webpack_require__("./src/reports/components/report-sections/collapsible-script-provider.tsx"), __webpack_require__("./src/reports/package/axe-results-report.ts"), __webpack_require__("./src/reports/package/footer-text-for-service.tsx"), __webpack_require__("./src/reports/react-static-renderer.ts"), __webpack_require__("./src/reports/report-html-generator.tsx"), __webpack_require__("./src/scanner/check-message-transformer.ts"), __webpack_require__("./src/scanner/custom-rule-configurations.ts"), __webpack_require__("./src/scanner/help-url-getter.ts"), __webpack_require__("./src/scanner/message-decorator.ts"), __webpack_require__("./src/scanner/result-decorator.ts"), __webpack_require__("./src/scanner/rule-to-links-mappings.ts"), __webpack_require__("./src/common/components/fix-instruction-processor.tsx"), __webpack_require__("./src/common/configs/unified-result-property-configurations.tsx"), __webpack_require__("./src/common/date-provider.ts"), __webpack_require__("./src/common/fabric-icons.ts"), __webpack_require__("./src/common/get-guidance-tags-from-guidance-links.ts"), __webpack_require__("./src/reports/package/reporter.ts"), __webpack_require__("./src/reports/package/summary-results-report.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, application_properties_provider_1, rule_based_view_model_provider_1, uid_generator_1, resolution_creator_1, scan_results_to_unified_results_1, scan_results_to_unified_rules_1, automated_checks_report_section_factory_1, collapsible_script_provider_1, axe_results_report_1, footer_text_for_service_1, react_static_renderer_1, report_html_generator_1, check_message_transformer_1, custom_rule_configurations_1, help_url_getter_1, message_decorator_1, result_decorator_1, rule_to_links_mappings_1, fix_instruction_processor_1, unified_result_property_configurations_1, date_provider_1, fabric_icons_1, get_guidance_tags_from_guidance_links_1, reporter_1, summary_results_report_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reporterFactory = void 0;
    const axeResultsReportGenerator = (parameters) => {
        const { results: { testEngine: { version: axeVersion, }, testEnvironment: { userAgent, }, }, scanContext: { pageTitle: targetPageTitle, }, serviceName, } = parameters;
        const reactStaticRenderer = new react_static_renderer_1.ReactStaticRenderer();
        const fixInstructionProcessor = new fix_instruction_processor_1.FixInstructionProcessor();
        const toolData = application_properties_provider_1.createToolData(serviceName, '', 'axe-core', axeVersion, userAgent);
        const sectionFactory = Object.assign(Object.assign({}, automated_checks_report_section_factory_1.AutomatedChecksReportSectionFactory), { FooterTextForService: footer_text_for_service_1.FooterTextForService });
        const reportHtmlGenerator = new report_html_generator_1.ReportHtmlGenerator(sectionFactory, reactStaticRenderer, collapsible_script_provider_1.getDefaultAddListenerForCollapsibleSection, date_provider_1.DateProvider.getUTCStringFromDate, get_guidance_tags_from_guidance_links_1.GetGuidanceTagsFromGuidanceLinks, fixInstructionProcessor, unified_result_property_configurations_1.getPropertyConfiguration);
        const titleProvider = {
            title: () => targetPageTitle,
        };
        const messageDecorator = new message_decorator_1.MessageDecorator(custom_rule_configurations_1.configuration, new check_message_transformer_1.CheckMessageTransformer());
        const helpUrlGetter = new help_url_getter_1.HelpUrlGetter(custom_rule_configurations_1.configuration);
        const resultDecorator = new result_decorator_1.ResultDecorator(titleProvider, messageDecorator, (ruleId, axeHelpUrl) => helpUrlGetter.getHelpUrl(ruleId, axeHelpUrl), rule_to_links_mappings_1.ruleToLinkConfiguration);
        const getUnifiedResults = new scan_results_to_unified_results_1.ConvertScanResultsToUnifiedResults(uid_generator_1.generateUID, resolution_creator_1.getFixResolution, resolution_creator_1.getCheckResolution).automatedChecksConversion;
        const deps = {
            reportHtmlGenerator,
            resultDecorator,
            getUnifiedRules: scan_results_to_unified_rules_1.convertScanResultsToUnifiedRules,
            getUnifiedResults: getUnifiedResults,
            getCards: rule_based_view_model_provider_1.getCardViewData,
        };
        return new axe_results_report_1.AxeResultsReport(deps, parameters, toolData);
    };
    const summaryResultsReportGenerator = (parameters) => {
        const { serviceName, axeVersion, userAgent } = parameters;
        const toolData = application_properties_provider_1.createToolData(serviceName, '', 'axe-core', axeVersion, userAgent);
        return new summary_results_report_1.SummaryResultsReport(parameters, toolData);
    };
    fabric_icons_1.initializeFabricIcons();
    exports.reporterFactory = () => {
        return new reporter_1.Reporter(axeResultsReportGenerator, summaryResultsReportGenerator);
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/package/reporter.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Reporter = void 0;
    class Reporter {
        constructor(axeResultsReportGenerator, summaryResultsReportGenerator) {
            this.axeResultsReportGenerator = axeResultsReportGenerator;
            this.summaryResultsReportGenerator = summaryResultsReportGenerator;
        }
        fromAxeResult(parameters) {
            return this.axeResultsReportGenerator(parameters);
        }
        fromCrawlResults(parameters) {
            return this.summaryResultsReportGenerator(parameters);
        }
    }
    exports.Reporter = Reporter;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/package/summary-results-report.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SummaryResultsReport = void 0;
    class SummaryResultsReport {
        constructor(parameters, toolInfo) {
            this.parameters = parameters;
            this.toolInfo = toolInfo;
        }
        asHTML() {
            return 'Summary report html';
        }
    }
    exports.SummaryResultsReport = SummaryResultsReport;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/react-static-renderer.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react-dom/server")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, ReactDOMServer) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReactStaticRenderer = void 0;
    class ReactStaticRenderer {
        renderToStaticMarkup(element) {
            return ReactDOMServer.renderToStaticMarkup(element);
        }
    }
    exports.ReactStaticRenderer = ReactStaticRenderer;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/reports/report-html-generator.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/common/components/cards/card-interaction-support.ts"), __webpack_require__("./src/common/components/new-tab-link.tsx"), __webpack_require__("./src/common/components/null-component.tsx"), __webpack_require__("react"), __webpack_require__("./src/reports/components/report-sections/report-body.tsx"), __webpack_require__("./src/reports/components/report-sections/report-collapsible-container.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, card_interaction_support_1, new_tab_link_1, null_component_1, React, report_body_1, report_collapsible_container_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReportHtmlGenerator = void 0;
    class ReportHtmlGenerator {
        constructor(sectionFactory, reactStaticRenderer, getCollapsibleScript, utcDateConverter, getGuidanceTagsFromGuidanceLinks, fixInstructionProcessor, getPropertyConfiguration) {
            this.sectionFactory = sectionFactory;
            this.reactStaticRenderer = reactStaticRenderer;
            this.getCollapsibleScript = getCollapsibleScript;
            this.utcDateConverter = utcDateConverter;
            this.getGuidanceTagsFromGuidanceLinks = getGuidanceTagsFromGuidanceLinks;
            this.fixInstructionProcessor = fixInstructionProcessor;
            this.getPropertyConfiguration = getPropertyConfiguration;
        }
        generateHtml(scanDate, description, cardsViewData, scanMetadata) {
            const HeadSection = this.sectionFactory.HeadSection;
            const headMarkup = this.reactStaticRenderer.renderToStaticMarkup(React.createElement(HeadSection, null));
            const detailsProps = {
                description,
                scanDate,
                deps: {
                    fixInstructionProcessor: this.fixInstructionProcessor,
                    collapsibleControl: report_collapsible_container_1.ReportCollapsibleContainerControl,
                    getGuidanceTagsFromGuidanceLinks: this.getGuidanceTagsFromGuidanceLinks,
                    getPropertyConfigById: this.getPropertyConfiguration,
                    cardInteractionSupport: card_interaction_support_1.noCardInteractionsSupported,
                    cardsVisualizationModifierButtons: null_component_1.NullComponent,
                    LinkComponent: new_tab_link_1.NewTabLink,
                },
                cardsViewData: cardsViewData,
                toUtcString: this.utcDateConverter,
                getCollapsibleScript: this.getCollapsibleScript,
                getGuidanceTagsFromGuidanceLinks: this.getGuidanceTagsFromGuidanceLinks,
                fixInstructionProcessor: this.fixInstructionProcessor,
                scanMetadata,
            };
            const props = Object.assign({ sectionFactory: this.sectionFactory }, detailsProps);
            const bodyElement = React.createElement(report_body_1.ReportBody, Object.assign({}, props));
            const bodyMarkup = this.reactStaticRenderer.renderToStaticMarkup(bodyElement);
            return '<!DOCTYPE html><html lang="en">' + headMarkup + bodyMarkup + '</html>';
        }
    }
    exports.ReportHtmlGenerator = ReportHtmlGenerator;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/axe-utils.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("axe-core")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, axe) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getImageType = exports.hasBackgoundImage = exports.isWhiteSpace = exports.getImageCodedAs = exports.hasCustomWidgetMarkup = exports.getAttributes = exports.getPropertyValuesMatching = exports.getAccessibleDescription = exports.getAccessibleText = exports.getEvaluateFromCheck = exports.getMatchesFromRule = void 0;
    function getMatchesFromRule(ruleId) {
        return axe._audit.defaultConfig.rules.filter(rule => rule.id === ruleId)[0].matches;
    }
    exports.getMatchesFromRule = getMatchesFromRule;
    function getEvaluateFromCheck(checkId) {
        return axe._audit.defaultConfig.checks.filter(check => check.id === checkId)[0].evaluate;
    }
    exports.getEvaluateFromCheck = getEvaluateFromCheck;
    function getAccessibleText(node, isLabelledByContext) {
        return axe.commons.text.accessibleText(node, isLabelledByContext);
    }
    exports.getAccessibleText = getAccessibleText;
    function getAccessibleDescription(node) {
        return axe.commons.dom
            .idrefs(node, 'aria-describedby')
            .filter(ref => ref != null)
            .map(ref => axe.commons.text.accessibleText(ref))
            .join(' ');
    }
    exports.getAccessibleDescription = getAccessibleDescription;
    function getPropertyValuesMatching(node, regex) {
        const dictionary = {};
        if (node.hasAttributes()) {
            const attrs = node.attributes;
            for (let i = 0; i < attrs.length; i++) {
                const name = attrs[i].name;
                if (regex.test(name)) {
                    dictionary[name] = node.getAttribute(name);
                }
            }
        }
        return dictionary;
    }
    exports.getPropertyValuesMatching = getPropertyValuesMatching;
    function getAttributes(node, attributes) {
        const retDict = {};
        attributes
            .filter(attributeName => node.hasAttribute(attributeName))
            .forEach(attributeName => {
            const attributeValue = node.getAttribute(attributeName);
            retDict[attributeName] = attributeValue.length > 0 ? attributeValue : null;
        });
        return retDict;
    }
    exports.getAttributes = getAttributes;
    function hasCustomWidgetMarkup(node) {
        const tabIndex = node.getAttribute('tabindex');
        const ariaValues = getPropertyValuesMatching(node, /^aria-/);
        const hasRole = node.hasAttribute('role');
        // empty and invalid roles can be filtered out using 'valid-role-if-present' check if needed
        return tabIndex === '-1' || Object.keys(ariaValues).length > 0 || hasRole;
    }
    exports.hasCustomWidgetMarkup = hasCustomWidgetMarkup;
    function getImageCodedAs(node) {
        const role = node.getAttribute('role');
        const alt = node.getAttribute('alt');
        if (role === 'none' || role === 'presentation' || alt === '') {
            return 'Decorative';
        }
        if (node.tagName.toLowerCase() !== 'img' && role !== 'img') {
            // This covers implicitly decorative <svg>, <i>, and CSS background image cases
            return 'Decorative';
        }
        if (getAccessibleText(node, false) !== '' || isWhiteSpace(alt)) {
            return 'Meaningful';
        }
        return null;
    }
    exports.getImageCodedAs = getImageCodedAs;
    function isWhiteSpace(text) {
        return text != null && text.length > 0 && text.trim() === '';
    }
    exports.isWhiteSpace = isWhiteSpace;
    function hasBackgoundImage(node) {
        const computedBackgroundImage = window
            .getComputedStyle(node)
            .getPropertyValue('background-image');
        return computedBackgroundImage !== 'none';
    }
    exports.hasBackgoundImage = hasBackgoundImage;
    function getImageType(node) {
        let imageType = null;
        if (node.tagName.toLowerCase() === 'img') {
            imageType = '<img>';
        }
        else if (node.tagName.toLowerCase() === 'i') {
            imageType = 'icon fonts (empty <i> elements)';
        }
        else if (node.getAttribute('role') === 'img') {
            imageType = 'Role="img"';
        }
        else if (hasBackgoundImage(node)) {
            imageType = 'CSS background-image';
        }
        return imageType;
    }
    exports.getImageType = getImageType;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/check-message-transformer.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CheckMessageTransformer = void 0;
    class CheckMessageTransformer {
        addMessagesToChecks(checks, checkConfigurations) {
            for (let checkIndex = 0; checkIndex < checks.length; checkIndex++) {
                const checkResult = checks[checkIndex];
                const checkConfig = checkConfigurations
                    .filter(config => config.id === checkResult.id)
                    .pop();
                if (checkConfig == null) {
                    continue;
                }
                if (checkResult.result) {
                    checkResult.message = checkConfig.passMessage
                        ? checkConfig.passMessage()
                        : checkResult.message;
                }
                else {
                    checkResult.message = checkConfig.failMessage
                        ? checkConfig.failMessage()
                        : checkResult.message;
                }
            }
        }
    }
    exports.CheckMessageTransformer = CheckMessageTransformer;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/cues.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, axe_utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.generateARIACuesDictionary = exports.generateHTMLCuesDictionary = void 0;
    const htmlCues = ['readonly', 'disabled', 'required'];
    const ariaCues = ['aria-readonly', 'aria-disabled', 'aria-required'];
    function generateHTMLCuesDictionary(node) {
        return axe_utils_1.getAttributes(node, htmlCues);
    }
    exports.generateHTMLCuesDictionary = generateHTMLCuesDictionary;
    function generateARIACuesDictionary(node) {
        return axe_utils_1.getAttributes(node, ariaCues);
    }
    exports.generateARIACuesDictionary = generateARIACuesDictionary;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rule-configurations.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/custom-rules/autocomplete-rule.ts"), __webpack_require__("./src/scanner/custom-rules/color-rule.ts"), __webpack_require__("./src/scanner/custom-rules/css-content-rule.ts"), __webpack_require__("./src/scanner/custom-rules/css-positioning-rule.ts"), __webpack_require__("./src/scanner/custom-rules/cues-rule.ts"), __webpack_require__("./src/scanner/custom-rules/custom-widget.ts"), __webpack_require__("./src/scanner/custom-rules/frame-title.ts"), __webpack_require__("./src/scanner/custom-rules/header-rule.ts"), __webpack_require__("./src/scanner/custom-rules/heading-rule.ts"), __webpack_require__("./src/scanner/custom-rules/image-rule.ts"), __webpack_require__("./src/scanner/custom-rules/link-function.ts"), __webpack_require__("./src/scanner/custom-rules/link-purpose.ts"), __webpack_require__("./src/scanner/custom-rules/native-widgets-default.ts"), __webpack_require__("./src/scanner/custom-rules/page-title.ts"), __webpack_require__("./src/scanner/custom-rules/text-alternative.ts"), __webpack_require__("./src/scanner/custom-rules/text-contrast.ts"), __webpack_require__("./src/scanner/custom-rules/unique-landmark.ts"), __webpack_require__("./src/scanner/custom-rules/widget-function.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, autocomplete_rule_1, color_rule_1, css_content_rule_1, css_positioning_rule_1, cues_rule_1, custom_widget_1, frame_title_1, header_rule_1, heading_rule_1, image_rule_1, link_function_1, link_purpose_1, native_widgets_default_1, page_title_1, text_alternative_1, text_contrast_1, unique_landmark_1, widget_function_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.configuration = void 0;
    exports.configuration = [
        heading_rule_1.headingConfiguration,
        color_rule_1.colorConfiguration,
        unique_landmark_1.uniqueLandmarkConfiguration,
        image_rule_1.imageConfiguration,
        text_alternative_1.textAlternativeConfiguration,
        text_contrast_1.textContrastConfiguration,
        link_purpose_1.linkPurposeConfiguration,
        link_function_1.linkFunctionConfiguration,
        frame_title_1.frameTitleConfiguration,
        page_title_1.pageConfiguration,
        widget_function_1.widgetFunctionConfiguration,
        native_widgets_default_1.nativeWidgetsDefaultConfiguration,
        cues_rule_1.cuesConfiguration,
        custom_widget_1.customWidgetConfiguration,
        css_positioning_rule_1.cssPositioningConfiguration,
        css_content_rule_1.cssContentConfiguration,
        autocomplete_rule_1.autocompleteRuleConfiguration,
        header_rule_1.headerRuleConfiguration,
    ];
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/autocomplete-rule.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.autocompleteRuleConfiguration = void 0;
    const autocompleteCheckId = 'autocomplete';
    const autocompleteRuleId = 'autocomplete';
    exports.autocompleteRuleConfiguration = {
        checks: [
            {
                id: autocompleteCheckId,
                evaluate: evaluateAutocomplete,
            },
        ],
        rule: {
            id: autocompleteRuleId,
            selector: `input[type="text"],\
input[type="search"],\
input[type="url"],\
input[type="tel"],\
input[type="email"],\
input[type="password"],\
input[type="date"],\
input[type="date-time"],\
input[type="date-time-local"],\
input[type="range"],\
input[type="color"]`,
            any: [autocompleteCheckId],
            enabled: false,
        },
    };
    function evaluateAutocomplete(node) {
        const inputType = node.getAttribute('type');
        const autocomplete = node.getAttribute('autocomplete');
        const data = {
            inputType,
            autocomplete,
        };
        // tslint:disable-next-line:no-invalid-this
        this.data(data);
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/color-rule.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isInTopWindow = exports.colorConfiguration = void 0;
    const colorCheckId = 'select-body';
    exports.colorConfiguration = {
        checks: [
            {
                id: colorCheckId,
                evaluate: () => true,
            },
        ],
        rule: {
            id: 'select-body',
            selector: 'body',
            any: [colorCheckId],
            matches: () => isInTopWindow(window),
            enabled: false,
        },
    };
    function isInTopWindow(win) {
        return win.top === win;
    }
    exports.isInTopWindow = isInTopWindow;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/css-content-rule.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("axe-core")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, axe) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cssContentConfiguration = void 0;
    const cssContentCheckId = 'css-content';
    const cssContentRuleId = 'css-content';
    exports.cssContentConfiguration = {
        checks: [
            {
                id: cssContentCheckId,
                evaluate: () => true,
            },
        ],
        rule: {
            id: cssContentRuleId,
            selector: 'body',
            matches: pageHasElementsWithPseudoSelectors,
            any: [cssContentCheckId],
            enabled: false,
        },
    };
    function pageHasElementsWithPseudoSelectors(node) {
        const pseudoElements = getAllPseudoElements(node);
        return pseudoElements.length > 0;
    }
    function getAllPseudoElements(node) {
        const elements = node.querySelectorAll('*');
        const hasContent = styles => {
            return styles && styles.content !== 'none';
        };
        const pseudoElements = [];
        for (let index = 0; index < elements.length; index++) {
            const element = elements.item(index);
            const beforeStyles = window.getComputedStyle(element, ':before');
            const afterStyles = window.getComputedStyle(element, ':after');
            if (axe.commons.dom.isVisible(element) &&
                (hasContent(beforeStyles) || hasContent(afterStyles))) {
                pseudoElements.push(element);
            }
        }
        return pseudoElements;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/css-positioning-rule.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("axe-core")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, axe) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cssPositioningConfiguration = void 0;
    const cssPositioningCheckId = 'css-positioning';
    const cssPositioningRuleId = 'css-positioning';
    exports.cssPositioningConfiguration = {
        checks: [
            {
                id: cssPositioningCheckId,
                evaluate: () => true,
            },
        ],
        rule: {
            id: cssPositioningRuleId,
            selector: '*',
            any: [cssPositioningCheckId],
            matches: matches,
            enabled: false,
        },
    };
    function matches(node) {
        const nodeStyle = window.getComputedStyle(node);
        return (axe.commons.dom.isVisible(node) &&
            (isAbsolutePosition(nodeStyle) || isRightFloat(nodeStyle)));
    }
    function isAbsolutePosition(nodeStyle) {
        const position = nodeStyle.getPropertyValue('position').toLowerCase();
        return position === 'absolute';
    }
    function isRightFloat(nodeStyle) {
        const float = nodeStyle.getPropertyValue('float').toLowerCase();
        return float === 'right';
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/cues-rule.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts"), __webpack_require__("./src/scanner/cues.ts"), __webpack_require__("./src/scanner/custom-rules/native-widgets-default.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, AxeUtils, cues_1, native_widgets_default_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.evaluateCues = exports.cuesConfiguration = void 0;
    exports.cuesConfiguration = native_widgets_default_1.createNativeWidgetConfiguration('cues', 'cues-collector', evaluateCues);
    function evaluateCues(node) {
        // tslint:disable-next-line:no-invalid-this
        this.data({
            element: native_widgets_default_1.getNativeWidgetElementType(node),
            accessibleName: AxeUtils.getAccessibleText(node, false),
            htmlCues: cues_1.generateHTMLCuesDictionary(node),
            ariaCues: cues_1.generateARIACuesDictionary(node),
        });
        return true;
    }
    exports.evaluateCues = evaluateCues;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/custom-widget.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts"), __webpack_require__("./src/scanner/cues.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, AxeUtils, cues_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.customWidgetConfiguration = void 0;
    const checkId = 'custom-widget';
    exports.customWidgetConfiguration = {
        checks: [
            {
                id: checkId,
                evaluate: evaluateCustomWidget,
            },
        ],
        rule: {
            id: 'custom-widget',
            selector: createSelector(),
            enabled: false,
            any: [checkId],
        },
    };
    function createSelector() {
        const roles = [
            'alert',
            'alertdialog',
            'button',
            'checkbox',
            'combobox',
            'dialog',
            'feed',
            'grid',
            'link',
            'listbox',
            'menu',
            'menubar',
            'radiogroup',
            'separator',
            'slider',
            'spinbutton',
            'table',
            'tablist',
            'toolbar',
            'tooltip',
            'tree',
            'treegrid',
        ];
        const selectors = [];
        roles.forEach((role) => {
            selectors.push('[role=' + role + ']');
        });
        return selectors.join(',');
    }
    function evaluateCustomWidget(node) {
        const accessibleName = AxeUtils.getAccessibleText(node, false);
        const role = node.getAttribute('role');
        const describedBy = AxeUtils.getAccessibleDescription(node);
        const htmlCues = cues_1.generateHTMLCuesDictionary(node);
        const ariaCues = cues_1.generateARIACuesDictionary(node);
        const data = {
            accessibleName,
            role,
            describedBy,
            htmlCues,
            ariaCues,
        };
        // tslint:disable-next-line:no-invalid-this
        this.data(data);
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/frame-title.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.frameTitleConfiguration = void 0;
    const frameTitleId = 'get-frame-title';
    exports.frameTitleConfiguration = {
        checks: [
            {
                id: frameTitleId,
                evaluate: evaluateTitle,
            },
        ],
        rule: {
            id: frameTitleId,
            selector: 'frame, iframe',
            any: [frameTitleId],
            enabled: false,
        },
    };
    function evaluateTitle(node, options) {
        const frameTitle = node.title ? node.title.trim() : '';
        const frameResultData = {
            frameType: node.tagName.toLowerCase(),
            frameTitle,
        };
        // tslint:disable-next-line:no-invalid-this
        this.data(frameResultData);
        return !!frameTitle;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/header-rule.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.headerRuleConfiguration = void 0;
    const headersCheckId = 'collect-headers';
    exports.headerRuleConfiguration = {
        checks: [
            {
                id: headersCheckId,
                evaluate: () => true,
            },
        ],
        rule: {
            id: 'collect-headers',
            selector: 'th,[role=columnheader],[role=rowheader]',
            any: [headersCheckId],
            enabled: false,
        },
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/heading-rule.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.headingConfiguration = void 0;
    const headingCheckId = 'collect-headings';
    exports.headingConfiguration = {
        checks: [
            {
                id: headingCheckId,
                evaluate: evaluateCodedHeadings,
            },
        ],
        rule: {
            id: 'collect-headings',
            selector: 'h1,h2,h3,h4,h5,h6,[role=heading]',
            any: [headingCheckId],
            enabled: false,
        },
    };
    function evaluateCodedHeadings(node, options) {
        const headingText = node.innerText;
        let headingLevel;
        const ariaHeadingLevel = node.getAttribute('aria-level');
        if (ariaHeadingLevel !== null) {
            headingLevel = parseInt(ariaHeadingLevel, 10);
        }
        else {
            const codedHeadingLevel = node.tagName.match(/H(\d)/);
            if (codedHeadingLevel) {
                headingLevel = parseInt(codedHeadingLevel[1], 10);
            }
        }
        const headingResultData = {
            headingLevel: headingLevel,
            headingText: headingText,
        };
        // tslint:disable-next-line: no-invalid-this
        this.data(headingResultData);
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/image-rule.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("axe-core"), __webpack_require__("./src/scanner/axe-utils.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, axe, AxeUtils) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isImage = exports.imageConfiguration = void 0;
    exports.imageConfiguration = {
        checks: [
            {
                id: 'image-function-data-collector',
                evaluate: evaluateImageFunction,
            },
        ],
        rule: {
            id: 'image-function',
            selector: '*',
            any: ['image-function-data-collector'],
            all: [],
            matches: isImage,
            enabled: false,
        },
    };
    function isImage(node, virtualNode) {
        const selector = 'img, [role=img], svg';
        if (axe.utils.matchesSelector(node, selector)) {
            return true;
        }
        if (node.tagName.toLowerCase() === 'i' && node.innerHTML === '') {
            return true;
        }
        if (AxeUtils.hasBackgoundImage(node)) {
            return true;
        }
        return false;
    }
    exports.isImage = isImage;
    function evaluateImageFunction(node) {
        const accessibleName = AxeUtils.getAccessibleText(node, false);
        const codedAs = AxeUtils.getImageCodedAs(node);
        const imageType = AxeUtils.getImageType(node);
        const role = node.getAttribute('role');
        // tslint:disable-next-line:no-invalid-this
        this.data({
            imageType,
            accessibleName,
            codedAs,
            role,
        });
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/link-function.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts"), __webpack_require__("./src/scanner/role-utils.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, AxeUtils, role_utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.linkFunctionConfiguration = void 0;
    const checkId = 'link-function';
    const snippetKey = 'snippet';
    const hasValidRoleIfPresent = 'valid-role-if-present';
    exports.linkFunctionConfiguration = {
        checks: [
            {
                id: checkId,
                evaluate: evaluateLinkFunction,
            },
            {
                id: hasValidRoleIfPresent,
                evaluate: role_utils_1.RoleUtils.isValidRoleIfPresent,
            },
        ],
        rule: {
            id: 'link-function',
            selector: 'a',
            any: [checkId],
            all: [hasValidRoleIfPresent],
            none: ['has-widget-role'],
            matches: matches,
            decorateNode: (node) => {
                if (node.any.length > 0) {
                    node.snippet = node.any[0].data[snippetKey];
                }
            },
            enabled: false,
        },
    };
    function matches(node, virtualNode) {
        const href = node.getAttribute('href');
        return !href || href === '#' || AxeUtils.hasCustomWidgetMarkup(node);
    }
    function evaluateLinkFunction(node, options, virtualNode, context) {
        const accessibleName = AxeUtils.getAccessibleText(node, false);
        const ariaValues = AxeUtils.getPropertyValuesMatching(node, /^aria-/);
        const role = node.getAttribute('role');
        const tabIndex = node.getAttribute('tabindex');
        const url = node.getAttribute('href');
        const data = {
            accessibleName,
            ariaAttributes: ariaValues,
            role,
            tabIndex,
            url,
        };
        const missingNameOrUrl = !accessibleName || !url;
        const snippet = missingNameOrUrl ? node.parentElement.outerHTML : node.outerHTML;
        data[snippetKey] = snippet;
        // tslint:disable-next-line:no-invalid-this
        this.data(data);
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/link-purpose.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts"), __webpack_require__("./src/scanner/role-utils.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, AxeUtils, role_utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.linkPurposeConfiguration = void 0;
    const checkId = 'link-purpose';
    const hasValidRoleIfPresent = 'valid-role-if-present';
    exports.linkPurposeConfiguration = {
        checks: [
            {
                id: checkId,
                evaluate: evaluateLinkPurpose,
            },
            {
                id: hasValidRoleIfPresent,
                evaluate: role_utils_1.RoleUtils.isValidRoleIfPresent,
            },
        ],
        rule: {
            id: 'link-purpose',
            selector: 'a',
            any: [checkId],
            all: [hasValidRoleIfPresent],
            none: ['has-widget-role'],
            enabled: false,
        },
    };
    function evaluateLinkPurpose(node, options, virtualNode, context) {
        const accessibleName = AxeUtils.getAccessibleText(node, false);
        const accessibleDescription = AxeUtils.getAccessibleDescription(node);
        const url = node.getAttribute('href');
        const data = {
            element: 'link',
            accessibleName,
            accessibleDescription,
            url,
        };
        // tslint:disable-next-line:no-invalid-this
        this.data(data);
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/native-widgets-default.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts"), __webpack_require__("./src/scanner/role-utils.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, AxeUtils, role_utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getNativeWidgetElementType = exports.evaluateNativeWidget = exports.createNativeWidgetConfiguration = exports.nativeWidgetsDefaultConfiguration = exports.nativeWidgetSelector = void 0;
    exports.nativeWidgetSelector = 'button, input[list], input[type]:not([type="hidden"]), select, textarea';
    exports.nativeWidgetsDefaultConfiguration = createNativeWidgetConfiguration('native-widgets-default', 'native-widgets-default-collector');
    function createNativeWidgetConfiguration(ruleId, checkId, evaluate, matches) {
        return {
            checks: [
                {
                    id: checkId,
                    evaluate: evaluate || evaluateNativeWidget,
                },
                {
                    id: 'valid-role-if-present',
                    evaluate: role_utils_1.RoleUtils.isValidRoleIfPresent,
                },
            ],
            rule: {
                id: ruleId,
                selector: exports.nativeWidgetSelector,
                any: [checkId],
                all: ['valid-role-if-present'],
                none: ['has-widget-role'],
                matches: matches,
                enabled: false,
            },
        };
    }
    exports.createNativeWidgetConfiguration = createNativeWidgetConfiguration;
    function evaluateNativeWidget(node) {
        // tslint:disable-next-line:no-invalid-this
        this.data({
            element: getNativeWidgetElementType(node),
            accessibleName: AxeUtils.getAccessibleText(node, false),
            accessibleDescription: AxeUtils.getAccessibleDescription(node),
        });
        return true;
    }
    exports.evaluateNativeWidget = evaluateNativeWidget;
    function getNativeWidgetElementType(node) {
        if (node.tagName === 'BUTTON' || node.tagName === 'SELECT' || node.tagName === 'TEXTAREA') {
            return node.tagName.toLowerCase();
        }
        else if (node.tagName === 'INPUT' && node.hasAttribute('list')) {
            return 'input list';
        }
        else if (node.tagName === 'INPUT' && node.hasAttribute('type')) {
            return `input type="${node.getAttribute('type')}"`;
        }
        return undefined;
    }
    exports.getNativeWidgetElementType = getNativeWidgetElementType;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/page-title.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/document-utils.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, document_utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pageConfiguration = void 0;
    const pageCheckId = 'page-title';
    exports.pageConfiguration = {
        checks: [
            {
                id: pageCheckId,
                evaluate: evaluateTitle,
            },
        ],
        rule: {
            id: 'page-title',
            selector: 'html',
            any: [pageCheckId],
            matches: function matches(node, virtualNode) {
                return node.ownerDocument.defaultView.self === node.ownerDocument.defaultView.top;
            },
            enabled: false,
        },
    };
    function evaluateTitle(node, options) {
        const docUtil = new document_utils_1.DocumentUtils(document);
        const title = docUtil.title();
        if (title) {
            // tslint:disable-next-line: no-invalid-this
            this.data({ pageTitle: title });
        }
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/text-alternative.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts"), __webpack_require__("./src/scanner/custom-rules/image-rule.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, AxeUtils, image_rule_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.textAlternativeConfiguration = void 0;
    exports.textAlternativeConfiguration = {
        checks: [
            {
                id: 'text-alternative-data-collector',
                evaluate: evaluateTextAlternative,
            },
        ],
        rule: {
            id: 'accessible-image',
            selector: '*',
            any: ['text-alternative-data-collector'],
            all: [],
            matches: matches,
            enabled: false,
        },
    };
    function matches(node) {
        return image_rule_1.isImage(node, null) && AxeUtils.getImageCodedAs(node) === 'Meaningful';
    }
    function evaluateTextAlternative(node) {
        const accessibleName = AxeUtils.getAccessibleText(node, false);
        const accessibleDescription = AxeUtils.getAccessibleDescription(node);
        const imageType = AxeUtils.getImageType(node);
        const role = node.getAttribute('role');
        // tslint:disable-next-line:no-invalid-this
        this.data({
            imageType,
            accessibleName,
            accessibleDescription,
            role,
        });
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/text-contrast.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, AxeUtils) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.textContrastConfiguration = void 0;
    exports.textContrastConfiguration = {
        checks: [
            {
                id: 'text-contrast',
                evaluate: evaluateTextContrast,
            },
        ],
        rule: {
            id: 'text-contrast',
            selector: '*',
            any: ['text-contrast'],
            all: [],
            matches: AxeUtils.getMatchesFromRule('color-contrast'),
            excludeHidden: false,
            options: {
                noScroll: false,
            },
            enabled: false,
        },
    };
    function evaluateTextContrast(node, options, virtualNode, context) {
        const checkResult = AxeUtils.getEvaluateFromCheck('color-contrast').call(
        // tslint:disable-next-line:no-invalid-this
        this, node, options, virtualNode, context);
        const nodeStyle = window.getComputedStyle(node);
        const fontSize = parseFloat(nodeStyle.getPropertyValue('font-size'));
        const fontWeight = nodeStyle.getPropertyValue('font-weight');
        const bold = ['bold', 'bolder', '600', '700', '800', '900'].indexOf(fontWeight) !== -1;
        const data = {
            textString: node.innerText,
            size: isLargeText(fontSize, bold) ? 'large' : 'regular',
        };
        // tslint:disable-next-line:no-invalid-this
        this.data(data);
        return checkResult;
    }
    function isLargeText(fontSize, bold) {
        fontSize = (fontSize * 72) / 96;
        return fontSize >= 18 || (fontSize >= 14 && bold);
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/unique-landmark.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("axe-core")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, axe) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.uniqueLandmarkRuleContent = exports.uniqueLandmarkConfiguration = void 0;
    const id = 'unique-landmark';
    const passMessage = 'Landmarks must have a unique role or role/label combination (aria-label OR aria-labelledby)';
    const failMessage = 'The landmarks do not have a unique role or role/label combination (use aria-label OR aria-labelledby to make landmarks distinguishable)';
    const descriptionHelp = {
        description: 'unique landmarks test',
        help: passMessage,
    };
    exports.uniqueLandmarkConfiguration = {
        checks: [
            {
                id,
                evaluate,
                passMessage: () => passMessage,
                failMessage: () => failMessage,
            },
        ],
        rule: Object.assign(Object.assign({ id, selector: '[role=banner], [role=complementary], [role=contentinfo], [role=main], [role=navigation], [role=region], [role=search], [role=form], form, footer, header, aside, main, nav, section', any: [id], matches: function matches(node) {
                return isLandmark(node) && axe.commons.dom.isVisible(node, true);
            } }, descriptionHelp), { helpUrl: '/insights.html#/content/rules/uniqueLandmark' }),
    };
    exports.uniqueLandmarkRuleContent = {
        [id]: descriptionHelp,
    };
    function isLandmark(element) {
        const landmarkRoles = axe.commons.aria.getRolesByType('landmark');
        const role = getObservedRoleForElement(element);
        return (role && landmarkRoles.indexOf(role) >= 0) || role === 'region';
    }
    function getRoleSelectors(roleId) {
        const role = axe.commons.aria.lookupTable.role[roleId];
        let selectors = [];
        if (role && role.implicit) {
            selectors = selectors.concat(role.implicit);
        }
        selectors.push("[role='" + roleId + "']");
        return selectors;
    }
    function getObservedRoleForElement(element) {
        let role = element.getAttribute('role');
        role = role ? role.trim() : role;
        if (!role) {
            role = axe.commons.aria.implicitRole(element);
            const tagName = element.tagName.toLowerCase();
            if (tagName === 'header' || tagName === 'footer') {
                let parent = element.parentNode;
                while (parent && parent.nodeType === 1) {
                    const parentTagName = parent.tagName.toLowerCase();
                    const excludedDescendants = ['article', 'aside', 'main', 'nav', 'section'];
                    if (excludedDescendants.indexOf(parentTagName) >= 0) {
                        role = null;
                    }
                    parent = parent.parentNode;
                }
            }
            else if (tagName === 'section' || tagName === 'form') {
                const label = axe.commons.aria.label(element);
                if (!label) {
                    role = null;
                }
            }
        }
        if (role) {
            role = role.toLowerCase();
        }
        return role;
    }
    function evaluate(node, options) {
        if (isLandmark(node) === false) {
            return false;
        }
        const role = getObservedRoleForElement(node);
        let label = axe.commons.aria.label(node);
        let candidates = [];
        const selectors = getRoleSelectors(role);
        const selectorsLength = selectors.length;
        label = label ? label.toLowerCase() : null;
        // tslint:disable-next-line:no-invalid-this
        this.data({ role: role, label: label });
        for (let selectorPos = 0; selectorPos < selectorsLength; selectorPos++) {
            candidates = candidates.concat(axe.utils.toArray(document.querySelectorAll(selectors[selectorPos])));
        }
        const candidatesLength = candidates.length;
        if (candidatesLength > 1) {
            for (let candidatePos = 0; candidatePos < candidatesLength; candidatePos++) {
                const candidate = candidates[candidatePos];
                if (candidate !== node &&
                    isLandmark(candidate) &&
                    axe.commons.dom.isVisible(candidate, true)) {
                    let candidateLabel = axe.commons.aria.label(candidate);
                    candidateLabel = candidateLabel ? candidateLabel.toLowerCase() : null;
                    if (label === candidateLabel) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/custom-rules/widget-function.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/axe-utils.ts"), __webpack_require__("./src/scanner/custom-rules/native-widgets-default.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, AxeUtils, native_widgets_default_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.evaluateWidgetFunction = exports.widgetFunctionConfiguration = void 0;
    exports.widgetFunctionConfiguration = native_widgets_default_1.createNativeWidgetConfiguration('widget-function', 'widget-function-collector', evaluateWidgetFunction, AxeUtils.hasCustomWidgetMarkup);
    function evaluateWidgetFunction(node) {
        const ariaAttributes = [
            'aria-autocomplete',
            'aria-checked',
            'aria-expanded',
            'aria-level',
            'aria-modal',
            'aria-multiline',
            'aria-multiselectable',
            'aria-orientation',
            'aria-placeholder',
            'aria-pressed',
            'aria-readonly',
            'aria-required',
            'aria-selected',
            'aria-sort',
            'aria-valuemax',
            'aria-valuemin',
            'aria-valuenow',
            'aria-valuetext',
        ];
        // tslint:disable-next-line:no-invalid-this
        this.data({
            element: native_widgets_default_1.getNativeWidgetElementType(node),
            accessibleName: AxeUtils.getAccessibleText(node, false),
            role: node.getAttribute('role'),
            ariaAttributes: AxeUtils.getAttributes(node, ariaAttributes),
            tabIndex: node.getAttribute('tabindex'),
        });
        return true;
    }
    exports.evaluateWidgetFunction = evaluateWidgetFunction;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/document-utils.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DocumentUtils = void 0;
    // Copyright (c) Microsoft Corporation. All rights reserved.
    // Licensed under the MIT License.
    class DocumentUtils {
        constructor(dom) {
            this.dom = dom || document;
        }
        title() {
            return this.dom.title;
        }
    }
    exports.DocumentUtils = DocumentUtils;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/help-url-getter.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HelpUrlGetter = void 0;
    class HelpUrlGetter {
        constructor(ruleConfigs) {
            this.ruleConfigs = ruleConfigs;
        }
        getHelpUrl(ruleId, axeHelpUrl) {
            const customHelpUrl = this.getCustomHelpUrl(ruleId);
            return customHelpUrl || axeHelpUrl;
        }
        getCustomHelpUrl(ruleId) {
            for (let index = 0; index < this.ruleConfigs.length; index++) {
                const config = this.ruleConfigs[index];
                if (config.rule.id === ruleId && config.rule.helpUrl != null) {
                    return config.rule.helpUrl;
                }
            }
            return null;
        }
    }
    exports.HelpUrlGetter = HelpUrlGetter;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/message-decorator.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MessageDecorator = void 0;
    class MessageDecorator {
        constructor(configuration, checkMessageCreator) {
            this.configuration = configuration;
            this.checkMessageCreator = checkMessageCreator;
        }
        decorateResultWithMessages(results) {
            const ruleConfiguration = this.configuration
                .filter(config => config.rule.id === results.id)
                .pop();
            if (ruleConfiguration == null) {
                return;
            }
            results.description = ruleConfiguration.rule.description;
            results.help = ruleConfiguration.rule.help;
            results.nodes.forEach(resultNode => {
                this.checkMessageCreator.addMessagesToChecks(resultNode.all, ruleConfiguration.checks);
                this.checkMessageCreator.addMessagesToChecks(resultNode.none, ruleConfiguration.checks);
                this.checkMessageCreator.addMessagesToChecks(resultNode.any, ruleConfiguration.checks);
                if (ruleConfiguration.rule.decorateNode) {
                    ruleConfiguration.rule.decorateNode(resultNode);
                }
            });
        }
    }
    exports.MessageDecorator = MessageDecorator;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/processor.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Processor = void 0;
    var Processor;
    (function (Processor) {
        Processor.suppressedMessages = [
        // add messages to suppress here. Remove comment when non-empty.
        ].map(normalizeText);
        function normalizeText(text) {
            return text.toLowerCase().trim();
        }
        function suppressChecksByMessages(rule, removeEmptyRules = true) {
            rule.nodes = rule.nodes.filter((nodeResult) => {
                nodeResult.any = nodeResult.any.filter((check) => {
                    const checkShown = check.message != null
                        ? Processor.suppressedMessages.indexOf(normalizeText(check.message)) < 0
                        : true;
                    return checkShown;
                });
                return (nodeResult.any.length > 0 || nodeResult.none.length > 0 || nodeResult.all.length > 0);
            });
            if (removeEmptyRules && rule.nodes.length === 0) {
                return null;
            }
            return rule;
        }
        Processor.suppressChecksByMessages = suppressChecksByMessages;
    })(Processor = exports.Processor || (exports.Processor = {}));
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/result-decorator.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/scanner/processor.ts")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, processor_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResultDecorator = void 0;
    class ResultDecorator {
        constructor(documentUtils, messageDecorator, getHelpUrl, ruleToLinkConfiguration) {
            this.documentUtils = documentUtils;
            this.messageDecorator = messageDecorator;
            this.getHelpUrl = getHelpUrl;
            this.ruleToLinkConfiguration = ruleToLinkConfiguration;
        }
        decorateResults(results) {
            const scanResults = {
                passes: this.decorateAxeRuleResults(results.passes),
                violations: this.decorateAxeRuleResults(results.violations),
                inapplicable: this.decorateAxeRuleResults(results.inapplicable, true),
                incomplete: this.decorateAxeRuleResults(results.incomplete),
                timestamp: results.timestamp,
                targetPageUrl: results.url,
                targetPageTitle: this.documentUtils.title(),
            };
            return scanResults;
        }
        decorateAxeRuleResults(ruleResults, isInapplicable = false) {
            return ruleResults.reduce((filteredArray, result) => {
                this.messageDecorator.decorateResultWithMessages(result);
                const processedResult = processor_1.Processor.suppressChecksByMessages(result, !isInapplicable);
                if (processedResult != null) {
                    filteredArray.push(Object.assign(Object.assign({}, processedResult), { guidanceLinks: this.getMapping(result.id), helpUrl: this.getHelpUrl(result.id, result.helpUrl) }));
                }
                return filteredArray;
            }, []);
        }
        getMapping(ruleId) {
            if (this.ruleToLinkConfiguration == null) {
                return null;
            }
            return this.ruleToLinkConfiguration[ruleId];
        }
    }
    exports.ResultDecorator = ResultDecorator;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/role-utils.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("axe-core")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, axe) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RoleUtils = void 0;
    class RoleUtils {
        static isValidRoleIfPresent(node, options, virtualNode, context) {
            const role = node.getAttribute('role');
            if (role === null) {
                return true;
            }
            return axe.commons.aria.lookupTable.role[role] !== undefined;
        }
    }
    exports.RoleUtils = RoleUtils;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/scanner/rule-to-links-mappings.ts":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("./src/content/link.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, link_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ruleToLinkConfiguration = exports.BestPractice = void 0;
    exports.BestPractice = {
        text: 'Best Practice',
        href: '',
    };
    exports.ruleToLinkConfiguration = {
        'aria-input-field-name': [link_1.link.WCAG_4_1_2],
        'aria-toggle-field-name': [link_1.link.WCAG_4_1_2],
        'avoid-inline-spacing': [link_1.link.WCAG_1_4_12],
        'input-button-name': [link_1.link.WCAG_4_1_2],
        'landmark-unique': [exports.BestPractice],
        'role-img-alt': [link_1.link.WCAG_1_1_1],
        'scrollable-region-focusable': [link_1.link.WCAG_2_1_1, exports.BestPractice],
        'area-alt': [link_1.link.WCAG_1_1_1, link_1.link.WCAG_2_4_4, link_1.link.WCAG_4_1_2],
        'image-alt': [link_1.link.WCAG_1_1_1],
        'image-redundant-alt': [exports.BestPractice],
        'input-image-alt': [link_1.link.WCAG_1_1_1],
        'object-alt': [link_1.link.WCAG_1_1_1],
        'link-name': [/*link.WCAG_2_4_4, link.WCAG_4_1_2*/ exports.BestPractice],
        'audio-caption': [link_1.link.WCAG_1_2_1],
        'video-caption': [link_1.link.WCAG_1_2_2],
        'aria-required-children': [link_1.link.WCAG_1_3_1],
        'aria-required-parent': [link_1.link.WCAG_1_3_1],
        'definition-list': [link_1.link.WCAG_1_3_1],
        dlitem: [link_1.link.WCAG_1_3_1],
        'empty-heading': [exports.BestPractice],
        list: [link_1.link.WCAG_1_3_1],
        listitem: [link_1.link.WCAG_1_3_1],
        'p-as-heading': [exports.BestPractice],
        'table-duplicate-name': [exports.BestPractice],
        'table-fake-caption': [exports.BestPractice],
        'td-has-header': [exports.BestPractice],
        'td-headers-attr': [link_1.link.WCAG_1_3_1],
        'th-has-data-cells': [link_1.link.WCAG_1_3_1],
        'aria-roles': [link_1.link.WCAG_1_3_1, link_1.link.WCAG_4_1_1, link_1.link.WCAG_4_1_2],
        'aria-valid-attr-value': [link_1.link.WCAG_4_1_1, link_1.link.WCAG_4_1_2],
        'link-in-text-block': [exports.BestPractice, link_1.link.WCAG_1_4_1],
        'color-contrast': [link_1.link.WCAG_1_4_3],
        'meta-viewport-large': [exports.BestPractice],
        'meta-viewport': [exports.BestPractice],
        accesskeys: [exports.BestPractice],
        'server-side-image-map': [link_1.link.WCAG_2_1_1],
        'meta-refresh': [link_1.link.WCAG_2_2_1],
        blink: [link_1.link.WCAG_2_2_2],
        marquee: [link_1.link.WCAG_2_2_2],
        bypass: [link_1.link.WCAG_2_4_1],
        'frame-title': [link_1.link.WCAG_2_4_1],
        'document-title': [link_1.link.WCAG_2_4_2],
        tabindex: [exports.BestPractice],
        'html-has-lang': [link_1.link.WCAG_3_1_1],
        'html-lang-valid': [link_1.link.WCAG_3_1_1],
        'valid-lang': [link_1.link.WCAG_3_1_2],
        label: [link_1.link.WCAG_1_3_1, link_1.link.WCAG_4_1_2],
        'aria-valid-attr': [link_1.link.WCAG_4_1_1],
        'duplicate-id': [link_1.link.WCAG_4_1_1],
        'scope-attr-valid': [exports.BestPractice],
        'aria-allowed-attr': [link_1.link.WCAG_4_1_1, link_1.link.WCAG_4_1_2],
        'aria-required-attr': [link_1.link.WCAG_4_1_1, link_1.link.WCAG_4_1_2],
        'aria-hidden-body': [link_1.link.WCAG_4_1_2],
        'button-name': [link_1.link.WCAG_4_1_2],
        'frame-title-unique': [exports.BestPractice],
        'heading-order': [exports.BestPractice],
        'hidden-content': [exports.BestPractice],
        'href-no-hash': [exports.BestPractice],
        'label-title-only': [exports.BestPractice],
        region: [exports.BestPractice],
        'skip-link': [exports.BestPractice],
        'unique-landmark': [link_1.link.WCAG_2_4_1, exports.BestPractice],
        'landmark-main-is-top-level': [link_1.link.WCAG_1_3_1, exports.BestPractice],
        'landmark-one-main': [exports.BestPractice],
        'focus-order-semantics': [exports.BestPractice],
        'frame-tested': [exports.BestPractice],
        'landmark-banner-is-top-level': [link_1.link.WCAG_1_3_1, exports.BestPractice],
        'landmark-contentinfo-is-top-level': [link_1.link.WCAG_1_3_1, exports.BestPractice],
        'landmark-no-duplicate-banner': [link_1.link.WCAG_1_3_1, exports.BestPractice],
        'landmark-no-duplicate-contentinfo': [link_1.link.WCAG_1_3_1, exports.BestPractice],
        'page-has-heading-one': [exports.BestPractice],
        'duplicate-id-active': [link_1.link.WCAG_4_1_1],
        'duplicate-id-aria': [link_1.link.WCAG_4_1_1],
        'html-xml-lang-mismatch': [link_1.link.WCAG_3_1_1],
        'get-frame-title': [link_1.link.WCAG_4_1_2],
        'page-title': [link_1.link.WCAG_2_4_2],
        'aria-allowed-role': [exports.BestPractice],
        'autocomplete-valid': [link_1.link.WCAG_1_3_5],
        'css-orientation-lock': [exports.BestPractice],
        'aria-hidden-focus': [link_1.link.WCAG_4_1_2, link_1.link.WCAG_1_3_1],
        'form-field-multiple-labels': [exports.BestPractice],
        'label-content-name-mismatch': [exports.BestPractice],
        'landmark-complementary-is-top-level': [link_1.link.WCAG_1_3_1, exports.BestPractice],
        'svg-img-alt': [link_1.link.WCAG_1_1_1],
        'aria-roledescription': [link_1.link.WCAG_4_1_2],
        'identical-links-same-purpose': [exports.BestPractice],
        'landmark-no-duplicate-main': [exports.BestPractice],
        'no-autoplay-audio': [exports.BestPractice],
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/views/content/content-page.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/common/react/named-fc.ts"), __webpack_require__("./src/views/content/markup.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1, React, named_fc_1, markup_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ContentPage = exports.ContentProvider = exports.ContentCreator = exports.guidanceLinkTo = exports.linkTo = void 0;
    function linkTo(text, href) {
        return { text, href };
    }
    exports.linkTo = linkTo;
    function guidanceLinkTo(text, href, tags) {
        return { text, href, tags };
    }
    exports.guidanceLinkTo = guidanceLinkTo;
    function ContentCreator(linkMap) {
        function mapLinks(markup) {
            const map = {};
            lodash_1.forEach(linkMap, (hyperlink, key) => {
                map[key] = ({ children }) => (React.createElement(markup.HyperLink, { href: hyperlink.href }, children || hyperlink.text));
            });
            return map;
        }
        function create(fn) {
            return named_fc_1.NamedFC('ContentPageComponent', props => {
                const { deps, options } = props;
                const markup = markup_1.createMarkup(deps, options);
                return fn({ Markup: markup, Link: mapLinks(markup) });
            });
        }
        return create;
    }
    exports.ContentCreator = ContentCreator;
    function ContentProvider(root) {
        const create = ContentCreator();
        const notFoundPage = (path) => create(() => React.createElement("h1", null,
            "Cannot find ",
            path));
        function isContentPageComponent(leaf) {
            return (leaf &&
                leaf.displayName &&
                leaf.displayName === 'ContentPageComponent');
        }
        const flattenTree = (tree) => {
            const prefixEntry = (prefix) => ({ path, leaf }) => ({ path: prefix + '/' + path, leaf });
            const entries = lodash_1.toPairs(tree).map(([key, leaf]) => isContentPageComponent(leaf)
                ? { path: key, leaf }
                : flattenTree(leaf).map(prefixEntry(key)));
            return lodash_1.flatten(entries);
        };
        const rootEntries = flattenTree(root);
        function findPage(tree, [head, ...tail]) {
            if (!tree) {
                return null;
            }
            const branch = tree[head];
            if (isContentPageComponent(branch)) {
                if (tail.length === 0) {
                    return branch;
                }
                else {
                    return null;
                }
            }
            else {
                return findPage(branch, tail);
            }
        }
        function getPage(path) {
            return findPage(root, path.split('/')) || notFoundPage(path);
        }
        const allPaths = () => rootEntries.map(entry => entry.path);
        const pathTo = (component) => {
            const entry = rootEntries.find(e => e.leaf === component);
            return entry ? entry.path : null;
        };
        const contentFromReference = (reference) => isContentPageComponent(reference) ? reference : getPage(reference);
        const pathFromReference = (reference) => isContentPageComponent(reference) ? pathTo(reference) : reference;
        return { getPage, allPaths, pathTo, contentFromReference, pathFromReference };
    }
    exports.ContentProvider = ContentProvider;
    exports.ContentPage = {
        create: ContentCreator(),
        provider: ContentProvider,
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/views/content/markup.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("react"), __webpack_require__("react-helmet"), __webpack_require__("./src/assessments/markup.tsx"), __webpack_require__("./src/common/components/new-tab-link.tsx"), __webpack_require__("./src/common/icons/check-icon.tsx"), __webpack_require__("./src/common/icons/cross-icon.tsx"), __webpack_require__("./src/views/content/markup/code-example.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, React, react_helmet_1, markup_1, new_tab_link_1, check_icon_1, cross_icon_1, code_example_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createMarkup = void 0;
    exports.createMarkup = (deps, options) => {
        function Include(props) {
            const Content = props.content;
            return React.createElement(Content, { deps: deps, options: options });
        }
        function Title(props) {
            const { applicationTitle } = deps.textContent;
            const helmet = (React.createElement(react_helmet_1.Helmet, null,
                React.createElement("title", null,
                    props.children,
                    " - ",
                    applicationTitle)));
            return (React.createElement(React.Fragment, null,
                options && options.setPageTitle && helmet,
                React.createElement("h1", null, props.children)));
        }
        function HyperLink(props) {
            const { href } = props;
            const { openContentHyperLink } = deps.contentActionMessageCreator;
            return (React.createElement(new_tab_link_1.NewTabLink, { href: href, onClick: e => openContentHyperLink(e, href) }, props.children));
        }
        function Links(props) {
            return (React.createElement(React.Fragment, null,
                React.createElement("div", { className: "content-hyperlinks" }, React.Children.map(props.children, el => el))));
        }
        function Inline(props) {
            return React.createElement("div", { className: "content-inline" }, props.children);
        }
        function Do(props) {
            return (React.createElement(Column, null,
                React.createElement("div", { className: "do-header" },
                    React.createElement("h2", null, "Do"),
                    React.createElement(check_icon_1.CheckIcon, null)),
                React.createElement("div", { className: "do-section" }, props.children)));
        }
        function Dont(props) {
            return (React.createElement(Column, null,
                React.createElement("div", { className: "dont-header" },
                    React.createElement("h2", null, "Don't"),
                    React.createElement(cross_icon_1.CrossIcon, null)),
                React.createElement("div", { className: "dont-section" }, props.children)));
        }
        function Pass(props) {
            return (React.createElement(Column, null,
                React.createElement("div", { className: "pass-header" },
                    React.createElement(check_icon_1.CheckIcon, null),
                    " ",
                    React.createElement("h3", null, "Pass")),
                React.createElement("div", { className: "pass-section" }, props.children)));
        }
        function Fail(props) {
            return (React.createElement(Column, null,
                React.createElement("div", { className: "fail-header" },
                    React.createElement(cross_icon_1.CrossIcon, null),
                    " ",
                    React.createElement("h3", null, "Fail")),
                React.createElement("div", { className: "fail-section" }, props.children)));
        }
        function LandmarkLegend(props) {
            return React.createElement("span", { className: `landmarks-legend ${props.role}-landmark` }, props.children);
        }
        function Highlight(props) {
            return React.createElement("span", { className: "highlight" }, props.children);
        }
        function Table(props) {
            return React.createElement("ul", { className: "table" }, props.children);
        }
        function ProblemList(props) {
            return React.createElement("ul", { className: "accessibility-problems-list" }, props.children);
        }
        function Columns(props) {
            return React.createElement("div", { className: "columns" }, props.children);
        }
        function Column(props) {
            return React.createElement("div", { className: "column" }, props.children);
        }
        function PassFail(props) {
            const { passText, passExample, failText, failExample } = props;
            function formatExample(example) {
                if (typeof example === 'string') {
                    return React.createElement(code_example_1.CodeExample, null, example);
                }
                return example;
            }
            return (React.createElement("div", { className: "pass-fail-grid" },
                React.createElement("div", { className: "fail-section" },
                    React.createElement("div", { className: "fail-header" },
                        React.createElement(cross_icon_1.CrossIcon, null),
                        " ",
                        React.createElement("h3", null, "Fail")),
                    failText),
                failExample && React.createElement("div", { className: "fail-example" }, formatExample(failExample)),
                React.createElement("div", { className: "pass-section" },
                    React.createElement("div", { className: "pass-header" },
                        React.createElement(check_icon_1.CheckIcon, null),
                        " ",
                        React.createElement("h3", null, "Pass")),
                    passText),
                passExample && React.createElement("div", { className: "pass-example" }, formatExample(passExample))));
        }
        return {
            Tag: markup_1.Tag,
            Code: markup_1.Code,
            Term: markup_1.Term,
            Emphasis: markup_1.Emphasis,
            Do,
            Dont,
            Pass,
            Fail,
            PassFail,
            Columns,
            Column,
            Inline,
            HyperLink,
            Title,
            CodeExample: code_example_1.CodeExample,
            Highlight,
            Links,
            LandmarkLegend,
            Table,
            ProblemList,
            options,
            Include,
        };
    };
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "./src/views/content/markup/code-example.tsx":
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__("lodash"), __webpack_require__("react"), __webpack_require__("./src/assessments/markup.tsx")], __WEBPACK_AMD_DEFINE_RESULT__ = (function (require, exports, lodash_1, React, markup_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeExample = void 0;
    function CodeExample(props) {
        const { children } = props;
        let lineCount = 0;
        function getRegions(code) {
            if (code.length === 0) {
                return [];
            }
            if (code[0] === '[') {
                const end = code.indexOf(']');
                if (end > 0) {
                    return [code.slice(0, end + 1), ...getRegions(code.slice(end + 1))];
                }
                else {
                    return [code + ']'];
                }
            }
            const start = code.indexOf('[');
            if (start > 0) {
                return [code.slice(0, start), ...getRegions(code.slice(start))];
            }
            else {
                return [code];
            }
        }
        function renderLineBreaks(str) {
            return lodash_1.flatten(str.split('\n').map(s => [React.createElement("br", { key: `line-breaker-${lineCount++}` }), s])).slice(1);
        }
        function renderRegion(str, index) {
            if (str[0] === '[') {
                return [
                    React.createElement("span", { key: index, className: "highlight" }, renderLineBreaks(str.slice(1, -1))),
                ];
            }
            else {
                return renderLineBreaks(str);
            }
        }
        const regions = getRegions(children);
        const formattedCode = lodash_1.flatten(regions.map(renderRegion));
        return (React.createElement("div", { className: "code-example" },
            props.title && (React.createElement("div", { className: "code-example-title" },
                React.createElement("h4", null, props.title))),
            React.createElement("div", { className: "code-example-code" },
                React.createElement(markup_1.CodeBlock, null, formattedCode))));
    }
    exports.CodeExample = CodeExample;
}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ 0:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__("./src/reports/package/reporter-factory.ts");


/***/ }),

/***/ "@uifabric/styling/lib/index":
/***/ (function(module, exports) {

module.exports = require("@uifabric/styling/lib/index");

/***/ }),

/***/ "@uifabric/utilities":
/***/ (function(module, exports) {

module.exports = require("@uifabric/utilities");

/***/ }),

/***/ "axe-core":
/***/ (function(module, exports) {

module.exports = require("axe-core");

/***/ }),

/***/ "classnames":
/***/ (function(module, exports) {

module.exports = require("classnames");

/***/ }),

/***/ "lodash":
/***/ (function(module, exports) {

module.exports = require("lodash");

/***/ }),

/***/ "moment":
/***/ (function(module, exports) {

module.exports = require("moment");

/***/ }),

/***/ "office-ui-fabric-react":
/***/ (function(module, exports) {

module.exports = require("office-ui-fabric-react");

/***/ }),

/***/ "react":
/***/ (function(module, exports) {

module.exports = require("react");

/***/ }),

/***/ "react-dom/server":
/***/ (function(module, exports) {

module.exports = require("react-dom/server");

/***/ }),

/***/ "react-helmet":
/***/ (function(module, exports) {

module.exports = require("react-helmet");

/***/ }),

/***/ "uuid":
/***/ (function(module, exports) {

module.exports = require("uuid");

/***/ })

/******/ });
});