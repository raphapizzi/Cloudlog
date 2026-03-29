<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

/*
	
	Widgets are designed to be addons to use around the internet.
		
*/

class Widgets extends CI_Controller {

	public function index()
	{
		// Show a help page
	}
	
	
	// Can be used to embed last 11 QSOs in a iframe or javascript include.
	public function qsos($logbook_slug = null) {

		if($logbook_slug == null) {
			show_error('Unknown Public Page, please make sure the public slug is correct.');
		}
		$this->load->model('logbook_model');

		$this->load->model('logbooks_model');
		if($this->logbooks_model->public_slug_exists($logbook_slug)) {
			// Load the public view

			$logbook_id = $this->logbooks_model->public_slug_exists_logbook_id($logbook_slug);
			if($logbook_id != false)
			{
				// Get associated station locations for mysql queries
				$logbooks_locations_array = $this->logbooks_model->list_logbook_relationships($logbook_id);

				if (!$logbooks_locations_array) {
					show_404('Empty Logbook');
				}
			} else {
				log_message('error', $logbook_slug.' has no associated station locations');
				show_404('Unknown Public Page.');
			}

			$data['last_five_qsos'] = $this->logbook_model->get_last_qsos(15, $logbooks_locations_array);
			
			$this->load->view('widgets/qsos', $data);
		}
	}

	// Embeddable "on air" status widget - pass a callsign to get current radio/satellite status.
	// Embed via: <iframe src="/widgets/on_air/M0ABC" width="300" height="120" frameborder="0"></iframe>
	public function on_air($callsign = null) {
		if ($callsign == null) {
			show_error('Please provide a callsign. Usage: widgets/on_air/YOURCALL');
		}

		$this->load->model('user_model');
		$user_result = $this->user_model->get_by_callsign($callsign);

		if ($user_result->num_rows() == 0) {
			show_error('No user found with callsign: ' . htmlspecialchars($callsign, ENT_QUOTES, 'UTF-8'));
		}

		$user = $user_result->row();

		$this->load->model('cat');
		$data['radio_status'] = $this->cat->recent_status_by_user_id($user->user_id);
		$data['callsign'] = strtoupper($this->security->xss_clean($callsign));

		$this->load->view('widgets/on_air', $data);
	}
}