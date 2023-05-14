import initialState from './initialState.json';
import * as actionTypes from '../actions/actionTypes';
export default function authReducer(state = initialState.auth, action) {
    switch (action.type) {
        case actionTypes.SIGN_IN_FAILED:
            return {
                loading: false,
                ErrorMessage: action.error
            }
        case actionTypes.SIGN_IN_REQUEST:
            return {
                loading: true,
                ErrorMessage: ""
            }
        case actionTypes.SIGN_IN_SUCCESS:
            return { loading: false, ErrorMessage: "" }
        case actionTypes.REGISTER_REQUEST:
            return {
                loading: true,
                ErrorMessage: ""
            }
        case actionTypes.REGISTER_SUCCESS:
            return { loading: false, ErrorMessage: "" }
        case actionTypes.REGISTER_FAILED:
            return {
                loading: false,
                ErrorMessage: action.error
            }
        case actionTypes.SIGN_OUT_FAILED:
            return  {
                loading: false,
                ErrorMessage: action.error
            }
        case actionTypes.REMOVE_ERROR:
            return {
                loading: false,
                ErrorMessage: ""
            }
        default:
            return state;
    }
}