import os

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

# HTTPBearer() extracts the access token from the request's Authorization: Bearer ... header.
security = HTTPBearer()

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]
)

# Depends() will later connect our authentication function to FastAPI endpoints.
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:

    #HTTPBearer extracts the token from the request header. We store it in token.
    token = credentials.credentials

    try:
        #Verify the token
        response = supabase.auth.get_user(token)
        user = response.user
        
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

        return{
            "id":str(user.id),
            "email": user.email,
        }
    
    except HTTPException:
        raise 
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        )
