import { TrainAssetsController } from "../controllers/train.assets.controller";
import { UTASIController } from "../controllers/utasi.controller";
import express from "express";

const router = express.Router();

router.get("/contracts", UTASIController.getContracts);

router.post("/contracts/attach", UTASIController.attachContract);

router.put("/asset/:id", UTASIController.updateAsset);

router.put("/parapets/status/update", UTASIController.updateParapetStatus);

router.get("/stations", UTASIController.getStations);

router.get("/stations/details", UTASIController.getAllStationDetails);

router.get("/stations/specs", UTASIController.getStationSpecs);

router.get("/stations/contracts", UTASIController.getContractFromAsset);

router.get("/train/assets", TrainAssetsController.getTrainAssets);

router.get("/train/assetsSpecs", TrainAssetsController.getTrainAssetSpecs);

router.get("/train/external/specs", TrainAssetsController.getExternalAssetSpecs);

router.put("/train/assets/book/:id", TrainAssetsController.bookTrainAsset);

router.put("/train/assets/edit/:id", TrainAssetsController.updateTrainAsset);

export const UTASIRoute = router;
