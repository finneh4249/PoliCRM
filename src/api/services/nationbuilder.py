import os
import requests
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

class NationBuilderClient:
    def __init__(self):
        self.slug = os.getenv("NATIONBUILDER_SLUG")
        self.token = os.getenv("NATIONBUILDER_API_TOKEN")
        self.base_url = f"https://{self.slug}.nationbuilder.com/api/v1"
        
        if not self.slug or not self.token:
            logger.warning("NationBuilder credentials not found in environment variables")

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def get_people(self, limit: int = 100, offset: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch people from NationBuilder.
        NB API uses cursor-based pagination or offset depending on endpoint version.
        V1 people endpoint uses 'limit' and 'next' cursor in response.
        """
        if not self.token:
            return {"results": []}
            
        url = f"{self.base_url}/people"
        params = {"limit": limit}
        if offset:
            params["__nonce"] = offset # NB often uses nonce or specific cursor params

        try:
            response = requests.get(url, headers=self._get_headers(), params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching people from NationBuilder: {e}")
            return {"results": []}

    def get_person(self, nb_id: int) -> Optional[Dict[str, Any]]:
        if not self.token:
            return None
            
        url = f"{self.base_url}/people/{nb_id}"
        try:
            response = requests.get(url, headers=self._get_headers())
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json().get("person")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching person {nb_id}: {e}")
            return None

    def update_person(self, nb_id: int, data: Dict[str, Any]) -> bool:
        if not self.token:
            return False
            
        url = f"{self.base_url}/people/{nb_id}"
        payload = {"person": data}
        
        try:
            response = requests.put(url, headers=self._get_headers(), json=payload)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error updating person {nb_id}: {e}")
            return False

    def add_tag(self, nb_id: int, tag: str) -> bool:
        if not self.token:
            return False
            
        url = f"{self.base_url}/people/{nb_id}/tagging"
        payload = {"tagging": {"tag": tag}}
        
        try:
            response = requests.put(url, headers=self._get_headers(), json=payload)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error adding tag to person {nb_id}: {e}")
            return False
