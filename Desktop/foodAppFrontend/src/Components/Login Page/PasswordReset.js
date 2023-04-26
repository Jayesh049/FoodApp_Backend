import axios from 'axios';
import '../Styles/login.css'
import React , { useState }  from 'react';
import { useAuth } from '../Context/AuthProvider';
import { useHistory } from 'react-router-dom';

function PasswordReset() {

    const [ password , passwordSet ] = useState("");
    const [passwordcnf , passwordcnfset ] = useState("");

    const {resetPasswordEmail , setResetEmail , setOtpPassEmail , otpPassEmail } = useAuth();
    const history = useHistory();

    //email , otp
    //ye send karega request to our resetPassword
    const resetPassword = async () =>{
        // i will send everything jo required hoga
        //done -> email , otp -> null
        //send  to login Page
        //no done -> email , otp -> null
        try {
            let res = await axios.patch("https://nice-pink-swordfish.cyclic.app/api/v1/auth/resetPassword",{
                otp : otpPassEmail,
                email: resetPasswordEmail,
                password : password,
                confirmPassword : passwordcnf
            })
            //whenever
            if(res.status === 201){
                alert("password changed successfully");
                setOtpPassEmail(null);
                setResetEmail(null);
                history.push("/login");
            }else if( res.status === 400){
                //inside this status there are two conditions
                if(res.status === "Otp Expired"){
                    alert("Otp expired kindly regenerate")
                }else if(res.message === "wrong otp"){
                    alert("wrong otp");
                }
                setOtpPassEmail(null);
                setResetEmail(null);
            }
        } catch (err){
            console.log(err.message);
            if(err.message === "Request failed with status code 500"){
                alert("Internal server error");
            }
            //jab bhi koi bhi try catch chale hum otp aur email ko null kar denge so that we cant use in future purpose
            setOtpPassEmail(null);
            setResetEmail(null);
        }
    }
    return (
        //agar email aur otp mili hai toh hi iss page se redirect karo 
        //nahi mile hai toh first go to your forget password
        <>
        {
            resetPasswordEmail && otpPassEmail ?
            <div className="container-grey">
        <div className="form-container">
            <div className='h1Box'>
                <h1 className='h1'>ENTER OTP</h1>
                <div className="line"></div>
            </div>
            <div className="loginBox">
            <div className="entryBox">
                        <div className="entryText">Password</div>
                        <input className="password input" type="text" value={password}  onChange={(e) => passwordSet(e.target.value)} />
                    </div>
                    <div className="entryBox">
                        <div className="entryText">Confirm  Password</div>
                        <input className="password input" type="text" value={passwordcnf}  onChange={(e) => passwordcnfset(e.target.value)} />
                    </div>
                <button className="loginBtn  form-button"
                    onClick={resetPassword}>
                    Send OTP
                </button>

            </div>
        </div>
    </div>
    : <h2 className="container-grey">First go to your Forget Password</h2>
        }
        </>
    )
}
export default PasswordReset