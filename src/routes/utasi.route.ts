import { TrainController } from "../controllers/train.controller";
import { UTASIController } from "../controllers/utasi.controller";
import { ExternalController } from "../controllers/external.controller";
import { StationController } from "../controllers/station.controller";
import express from "express";
import { AvailabilityController } from "../controllers/availability.controller";

const router = express.Router();

// UTASI Routes
router.get("/contracts", UTASIController.getContracts);
router.post("/contracts/attach", UTASIController.attachContract);
router.get("/stations/contracts", UTASIController.getContractFromAsset);
router.delete("/contracts/:id", UTASIController.untagContract);
router.put("/specs/edit/:asset_id", UTASIController.editSpecDetails);

// Station Routes
router.put("/asset/:id", StationController.updateAsset);
router.put("/parapets/status/update", StationController.updateParapetStatus);
router.get("/stations", StationController.getStations);
router.get("/stations/details", StationController.getAllStationDetails);
router.get("/stations/specs", StationController.getStationSpecs);

// Availability
router.get("/availability/parapets", AvailabilityController.getParapetsAvailability);
router.get("/availability/backlits", AvailabilityController.getBacklitsAvailability);
router.get("/availability/ticketbooths", AvailabilityController.getTicketBoothsAvailability);
router.get("/availability/stairs", AvailabilityController.getStairsAvailability);

// Train Routes
router.get("/train/assets", TrainController.getTrainAssets);
router.get("/train/assetsSpecs", TrainController.getTrainAssetSpecs);
router.put("/train/assets/book/:id", TrainController.bookTrainAsset);
router.put("/train/assets/edit/:id", TrainController.updateTrainAsset);

// External Routes
router.get("/train/external/specs/:asset_id", ExternalController.getExternalAssetSpecs);
router.post("/train/external/addViaduct", ExternalController.addViaductAssetAndSpecs);
router.put("/train/external/updateExternal/:id", ExternalController.updateExternalBooking);
router.delete("/train/external/deleteViaduct/:id/:spec_id", ExternalController.deleteViaductAssetAndSpecs);

export const UTASIRoute = router;
